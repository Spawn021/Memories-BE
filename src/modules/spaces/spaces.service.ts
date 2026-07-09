import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { SpacesRepository } from './spaces.repository'
import { CreateSpaceDto } from './dto/create-space.dto'
import { UpdateSpaceDto } from './dto/update-space.dto'
import { UpdateMemberRoleDto } from './dto/update-member-role.dto'
import { CreateInviteDto } from './dto/create-invite.dto'
import { GetSpaceMembersDto } from './dto/get-space-members.dto'
import { v4 as uuidv4 } from 'uuid'
import { SpaceRole, SpaceMemberStatus, SpaceVisibility } from '../../../generated/prisma/client'
import { SPACE_MEMBER_LIMITS } from 'src/common/constants'
import { generateSlug } from 'src/common/utils'
import { MailService } from '../../core/mail/mail.service'
import { RedisService } from '../../core/redis/redis.service'
import { GetSpacesDto } from './dto/get-spaces.dto'

@Injectable()
export class SpacesService {
  constructor(
    private spacesRepository: SpacesRepository,
    private mailService: MailService,
    private redisService: RedisService,
  ) {}

  async create(dto: CreateSpaceDto, ownerId: number) {
    const uuid = uuidv4()
    let slug = generateSlug(dto.name)

    const existingSlug = await this.spacesRepository.findBySlug(slug)
    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`
    }

    const spaceData = {
      uuid,
      name: dto.name,
      slug,
      description: dto.description,
      avatarUrl: dto.avatarUrl,
      coverUrl: dto.coverUrl,
      type: dto.type,
      visibility: dto.visibility,
      themeKey: dto.themeKey,
      layoutKey: dto.layoutKey,
      owner: {
        connect: { id: ownerId },
      },
      members: {
        create: {
          userId: ownerId,
          role: SpaceRole.OWNER,
        },
      },
    }

    return this.spacesRepository.create(spaceData)
  }

  async findAllForUser(userId: number, dto: GetSpacesDto) {
    return this.spacesRepository.findManyForUser(userId, dto)
  }

  async findOne(uuidOrSlug: string, requesterId: number) {
    const space = await this.spacesRepository.findByUuidOrSlug(uuidOrSlug)
    if (!space) {
      throw new NotFoundException('Space not found')
    }

    const member = space.members.find(m => m.userId === requesterId)
    const isActiveMember = member && member.status === SpaceMemberStatus.ACTIVE

    if (!isActiveMember) {
      return {
        id: space.id,
        uuid: space.uuid,
        name: space.name,
        slug: space.slug,
        description: space.description,
        avatarUrl: space.avatarUrl,
        coverUrl: space.coverUrl,
        type: space.type,
        visibility: space.visibility,
        createdAt: space.createdAt,
        members: [],
      }
    }

    return space
  }

  async update(uuid: string, dto: UpdateSpaceDto) {
    const updateData = {
      name: dto.name,
      description: dto.description,
      avatarUrl: dto.avatarUrl,
      coverUrl: dto.coverUrl,
      visibility: dto.visibility,
      themeKey: dto.themeKey,
      layoutKey: dto.layoutKey,
    }

    return this.spacesRepository.update(uuid, updateData)
  }

  async remove(uuid: string) {
    await this.spacesRepository.softDelete(uuid)
    await this.redisService.del(`space:uuid-to-id:${uuid}`)
  }

  async search(query: string) {
    return this.spacesRepository.searchSpaces(query)
  }

  async findMembers(spaceId: number, requesterRole: SpaceRole, query: GetSpaceMembersDto) {
    const { page, limit, status } = query

    if (status && status !== SpaceMemberStatus.ACTIVE) {
      if (requesterRole !== SpaceRole.OWNER && requesterRole !== SpaceRole.ADMIN) {
        throw new ForbiddenException('Only owners and admins can view pending/rejected requests')
      }
    }

    const filterStatus = status || SpaceMemberStatus.ACTIVE

    return this.spacesRepository.findSpaceMembers(
      spaceId,
      { page, limit },
      { status: filterStatus },
    )
  }

  async updateMemberRole(
    spaceId: number,
    memberUserId: number,
    dto: UpdateMemberRoleDto,
    requestUserId: number,
    requesterRole: SpaceRole,
  ) {
    const targetMember = await this.spacesRepository.findMember(spaceId, memberUserId)
    if (!targetMember) {
      throw new NotFoundException('Member not found in this space')
    }

    if (targetMember.role === SpaceRole.OWNER) {
      throw new ForbiddenException('Cannot modify the role of the space owner')
    }

    if (dto.role === SpaceRole.OWNER) {
      throw new ForbiddenException('Cannot assign the OWNER role')
    }

    if (requesterRole === SpaceRole.ADMIN) {
      if (memberUserId === requestUserId) {
        throw new ForbiddenException('Admins cannot modify their own role')
      }
      if (targetMember.role === SpaceRole.ADMIN) {
        throw new ForbiddenException('Admins cannot modify roles of other admins')
      }
      if (dto.role === SpaceRole.ADMIN) {
        throw new ForbiddenException('Admins cannot promote other members to admin')
      }
    }

    const result = await this.spacesRepository.updateMemberRole(spaceId, memberUserId, dto.role)
    await this.redisService.del(`space:member:${spaceId}:${memberUserId}`)
    return result
  }

  async removeMember(
    spaceId: number,
    memberUserId: number,
    requestUserId: number,
    requesterRole: SpaceRole,
  ) {
    const targetMember = await this.spacesRepository.findMember(spaceId, memberUserId)

    if (!targetMember) {
      throw new NotFoundException('Member not found in this space')
    }

    if (targetMember.role === SpaceRole.OWNER) {
      throw new ForbiddenException('Cannot remove the owner of the space')
    }

    const isSelfLeaving = memberUserId === requestUserId
    if (!isSelfLeaving) {
      if (requesterRole !== SpaceRole.OWNER && requesterRole !== SpaceRole.ADMIN) {
        throw new ForbiddenException('Only owners and admins can remove members')
      }

      if (requesterRole === SpaceRole.ADMIN && targetMember.role === SpaceRole.ADMIN) {
        throw new ForbiddenException('Admins cannot remove other admins')
      }
    }

    await this.spacesRepository.deleteMember(spaceId, memberUserId)
    await this.redisService.del(`space:member:${spaceId}:${memberUserId}`)
  }

  async createInvite(
    spaceId: number,
    dto: CreateInviteDto,
    requestUserId: number,
    inviterName: string,
  ) {
    const space = await this.spacesRepository.findById(spaceId)
    const activeMembersCount = await this.spacesRepository.countMembers(spaceId, {
      status: SpaceMemberStatus.ACTIVE,
    })
    const limit = SPACE_MEMBER_LIMITS[space!.type]
    if (activeMembersCount >= limit) {
      throw new BadRequestException(
        `Space member limit reached for ${space!.type} spaces (limit: ${limit})`,
      )
    }

    const token = uuidv4()
    const expiresAt = new Date(Date.now() + dto.expiresInHours * 60 * 60 * 1000)

    const inviteData = {
      spaceId,
      createdBy: requestUserId,
      token,
      role: dto.role,
      email: dto.email || null,
      message: dto.message || null,
      requiresApproval: dto.requiresApproval !== undefined ? dto.requiresApproval : true,
      expiresAt,
    }

    const invite = await this.spacesRepository.createInvite(inviteData)

    if (dto.email) {
      await this.mailService.sendSpaceInvite(
        dto.email,
        space!.name,
        token,
        inviterName,
        dto.message || undefined,
      )
    }

    return invite
  }

  async validateInvite(token: string) {
    const invite = await this.spacesRepository.findInviteByToken(token)
    if (!invite || invite.isRevoked || invite.space.deletedAt !== null) {
      throw new NotFoundException('Invite link is invalid or has been revoked')
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite link has expired')
    }

    return {
      token: invite.token,
      role: invite.role,
      email: invite.email,
      message: invite.message,
      requiresApproval: invite.requiresApproval,
      expiresAt: invite.expiresAt,
      space: {
        uuid: invite.space.uuid,
        name: invite.space.name,
        avatarUrl: invite.space.avatarUrl,
      },
      creator: {
        id: invite.creator.id,
        email: invite.creator.email,
        profile: invite.creator.profile,
      },
    }
  }

  async acceptInvite(token: string, userId: number) {
    const invite = await this.spacesRepository.findInviteByToken(token)
    if (!invite || invite.isRevoked || invite.space.deletedAt !== null) {
      throw new NotFoundException('Invite link is invalid or has been revoked')
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite link has expired')
    }

    const user = await this.spacesRepository.findUserById(userId)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    if (invite.email && invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invitation is only for the email address: ' + invite.email)
    }

    const existingMember = await this.spacesRepository.findMember(invite.spaceId, userId)
    if (existingMember) {
      if (existingMember.status === SpaceMemberStatus.ACTIVE) {
        throw new BadRequestException('You are already a member of this space')
      }
    }

    const status = invite.email
      ? SpaceMemberStatus.ACTIVE
      : invite.requiresApproval
        ? SpaceMemberStatus.PENDING
        : SpaceMemberStatus.ACTIVE

    if (status === SpaceMemberStatus.ACTIVE) {
      const activeMembersCount = await this.spacesRepository.countMembers(invite.spaceId, {
        status: SpaceMemberStatus.ACTIVE,
      })
      const limit = SPACE_MEMBER_LIMITS[invite.space.type]
      if (activeMembersCount >= limit) {
        throw new BadRequestException(
          `Space member limit reached for ${invite.space.type} spaces (limit: ${limit})`,
        )
      }
    }

    const role = invite.space.visibility === SpaceVisibility.PUBLIC ? SpaceRole.VIEWER : invite.role

    if (existingMember) {
      await this.spacesRepository.updateMemberStatusAndRole(
        invite.spaceId,
        userId,
        status,
        role,
        invite.createdBy,
      )
    } else {
      await this.spacesRepository.addMember(
        invite.spaceId,
        userId,
        role,
        invite.createdBy,
        status,
        null,
      )
    }

    await this.redisService.del(`space:member:${invite.spaceId}:${userId}`)

    return {
      status,
      space: {
        uuid: invite.space.uuid,
        name: invite.space.name,
        slug: invite.space.slug,
      },
    }
  }

  async requestToJoin(spaceUuid: string, userId: number, message?: string) {
    const space = await this.spacesRepository.findByUuid(spaceUuid)
    if (!space) {
      throw new NotFoundException('Space not found')
    }

    const existingMember = await this.spacesRepository.findMember(space.id, userId)
    if (existingMember) {
      if (existingMember.status === SpaceMemberStatus.ACTIVE) {
        throw new BadRequestException('You are already a member of this space')
      }
      if (existingMember.status === SpaceMemberStatus.PENDING) {
        throw new BadRequestException('You have a pending request to join this space')
      }
      if (existingMember.status === SpaceMemberStatus.REJECTED) {
        const cooldownHours = 24
        const nextAllowedRequestDate = new Date(
          existingMember.updatedAt.getTime() + cooldownHours * 60 * 60 * 1000,
        )
        if (nextAllowedRequestDate > new Date()) {
          const diffMs = nextAllowedRequestDate.getTime() - Date.now()
          const diffHours = Math.ceil(diffMs / (1000 * 60 * 60))
          throw new BadRequestException(`You can request to join again in ${diffHours} hour(s)`)
        }
      }
    }

    const status =
      space.visibility === SpaceVisibility.PUBLIC
        ? SpaceMemberStatus.ACTIVE
        : SpaceMemberStatus.PENDING

    if (status === SpaceMemberStatus.ACTIVE) {
      const activeMembersCount = await this.spacesRepository.countMembers(space.id, {
        status: SpaceMemberStatus.ACTIVE,
      })
      const limit = SPACE_MEMBER_LIMITS[space.type]
      if (activeMembersCount >= limit) {
        throw new BadRequestException(
          `Space member limit reached for ${space.type} spaces (limit: ${limit})`,
        )
      }
    }

    const role =
      space.visibility === SpaceVisibility.PUBLIC ? SpaceRole.VIEWER : SpaceRole.CONTRIBUTOR

    if (existingMember) {
      await this.spacesRepository.updateMemberStatusAndRole(
        space.id,
        userId,
        status,
        role,
        undefined,
        message || null,
      )
    } else {
      await this.spacesRepository.addMember(
        space.id,
        userId,
        role,
        undefined,
        status,
        message || null,
      )
    }

    await this.redisService.del(`space:member:${space.id}:${userId}`)

    return {
      status,
      space: {
        uuid: space.uuid,
        name: space.name,
        slug: space.slug,
      },
    }
  }

  async approveMember(spaceId: number, memberUserId: number) {
    const targetMember = await this.spacesRepository.findMember(spaceId, memberUserId)
    if (
      !targetMember ||
      (targetMember.status !== SpaceMemberStatus.PENDING &&
        targetMember.status !== SpaceMemberStatus.REJECTED)
    ) {
      throw new NotFoundException('Join request not found or member is already active')
    }

    const space = await this.spacesRepository.findById(spaceId)
    const activeMembersCount = await this.spacesRepository.countMembers(spaceId, {
      status: SpaceMemberStatus.ACTIVE,
    })
    const limit = SPACE_MEMBER_LIMITS[space!.type]
    if (activeMembersCount >= limit) {
      throw new BadRequestException(
        `Space member limit reached for ${space!.type} spaces (limit: ${limit})`,
      )
    }

    await this.spacesRepository.updateMemberStatus(spaceId, memberUserId, SpaceMemberStatus.ACTIVE)
    await this.redisService.del(`space:member:${spaceId}:${memberUserId}`)
  }

  async rejectMember(spaceId: number, memberUserId: number) {
    const targetMember = await this.spacesRepository.findMember(spaceId, memberUserId)
    if (!targetMember || targetMember.status !== SpaceMemberStatus.PENDING) {
      throw new NotFoundException('Pending join request not found')
    }

    await this.spacesRepository.updateMemberStatus(
      spaceId,
      memberUserId,
      SpaceMemberStatus.REJECTED,
    )
    await this.redisService.del(`space:member:${spaceId}:${memberUserId}`)
  }

  async revokeInvite(spaceId: number, inviteId: number) {
    const invite = await this.spacesRepository.findInviteById(inviteId)
    if (!invite || invite.spaceId !== spaceId) {
      throw new NotFoundException('Invite link not found in this space')
    }

    await this.spacesRepository.updateInviteStatus(inviteId, true)
  }
}
