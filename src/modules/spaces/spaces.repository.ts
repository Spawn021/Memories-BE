import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../core/prisma/prisma.service'
import { Prisma, SpaceRole, SpaceMemberStatus } from '../../../generated/prisma/client'
import { paginate, PaginateOptions } from '../../common/utils/prisma-paginate'
import { GetSpacesDto } from './dto/get-spaces.dto'
import { PaginationDto } from '../../common/dto/pagination.dto'

export interface SpaceMemberFilter {
  status?: SpaceMemberStatus
  role?: SpaceRole
}

@Injectable()
export class SpacesRepository {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.SpaceCreateInput) {
    return this.prisma.space.create({
      data,
      include: {
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    })
  }

  async findByUuid(uuid: string) {
    return this.prisma.space.findFirst({
      where: { uuid, deletedAt: null },
      include: {
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    })
  }

  async findByUuidOrSlug(identifier: string) {
    return this.prisma.space.findFirst({
      where: {
        OR: [{ uuid: identifier }, { slug: identifier }],
        deletedAt: null,
      },
      include: {
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    })
  }

  async findBySlug(slug: string) {
    return this.prisma.space.findFirst({
      where: { slug, deletedAt: null },
    })
  }

  async findManyForUser(userId: number, dto: GetSpacesDto) {
    const where: Prisma.SpaceWhereInput = {
      deletedAt: null,
    }

    if (dto.role === 'OWNER') {
      where.members = {
        some: {
          userId,
          role: SpaceRole.OWNER,
          status: SpaceMemberStatus.ACTIVE,
        },
      }
    } else if (dto.role === 'MEMBER') {
      where.members = {
        some: {
          userId,
          role: {
            not: SpaceRole.OWNER,
          },
          status: SpaceMemberStatus.ACTIVE,
        },
      }
    } else {
      where.members = {
        some: {
          userId,
          status: SpaceMemberStatus.ACTIVE,
        },
      }
    }

    if (dto.search) {
      where.OR = [
        {
          name: {
            contains: dto.search,
          },
        },
        {
          slug: {
            contains: dto.search,
          },
        },
      ]
    }

    if (dto.type && dto.type.length > 0) {
      where.type = { in: dto.type }
    }

    if (dto.visibility && dto.visibility.length > 0) {
      where.visibility = { in: dto.visibility }
    }

    const orderBy = {
      [dto.sortBy || 'createdAt']: dto.sortOrder || 'desc',
    }

    return paginate(
      this.prisma.space,
      { page: dto.page, limit: dto.limit },
      {
        where,
        orderBy,
        include: {
          members: {
            where: { status: 'ACTIVE' },
            select: {
              user: {
                select: {
                  id: true,
                  profile: {
                    select: { displayName: true, avatarUrl: true },
                  },
                },
              },
            },
          },
        },
      },
    )
  }

  async update(uuid: string, data: Prisma.SpaceUpdateInput) {
    return this.prisma.space.update({
      where: { uuid },
      data,
      include: {
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
      },
    })
  }

  async softDelete(uuid: string) {
    return this.prisma.space.update({
      where: { uuid },
      data: { deletedAt: new Date() },
    })
  }

  async addMember(
    spaceId: number,
    userId: number,
    role: SpaceRole,
    invitedBy?: number,
    status?: SpaceMemberStatus,
    joinRequestMessage?: string | null,
  ) {
    return this.prisma.spaceMember.create({
      data: {
        spaceId,
        userId,
        role,
        invitedBy,
        status,
        joinRequestMessage,
      },
    })
  }

  async findMember(spaceId: number, userId: number) {
    return this.prisma.spaceMember.findUnique({
      where: {
        uq_space_user: { spaceId, userId },
      },
      include: {
        user: {
          include: { profile: true },
        },
      },
    })
  }

  async findSpaceMembers(
    spaceId: number,
    paginateOptions: PaginateOptions,
    filter?: SpaceMemberFilter,
  ) {
    const where: Prisma.SpaceMemberWhereInput = {
      spaceId,
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.role ? { role: filter.role } : {}),
    }
    const include = {
      user: {
        include: { profile: true },
      },
    }

    return paginate(this.prisma.spaceMember, paginateOptions, {
      where,
      include,
    })
  }

  async countMembers(spaceId: number, filter?: SpaceMemberFilter): Promise<number> {
    return this.prisma.spaceMember.count({
      where: {
        spaceId,
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.role ? { role: filter.role } : {}),
      },
    })
  }

  async updateMemberRole(spaceId: number, userId: number, role: SpaceRole) {
    return this.prisma.spaceMember.update({
      where: {
        uq_space_user: { spaceId, userId },
      },
      data: { role },
    })
  }

  async deleteMember(spaceId: number, userId: number) {
    return this.prisma.spaceMember.delete({
      where: {
        uq_space_user: { spaceId, userId },
      },
    })
  }

  async createInvite(data: Prisma.SpaceInviteUncheckedCreateInput) {
    return this.prisma.spaceInvite.create({ data })
  }

  async findInviteByToken(token: string) {
    return this.prisma.spaceInvite.findUnique({
      where: { token },
      include: {
        space: true,
        creator: {
          include: { profile: true },
        },
      },
    })
  }

  async updateMemberStatus(spaceId: number, userId: number, status: SpaceMemberStatus) {
    return this.prisma.spaceMember.update({
      where: {
        uq_space_user: { spaceId, userId },
      },
      data: { status },
    })
  }

  async updateInviteStatus(inviteId: number, isRevoked: boolean) {
    return this.prisma.spaceInvite.update({
      where: { id: inviteId },
      data: { isRevoked },
    })
  }

  async searchSpaces(query: string) {
    return this.prisma.space.findMany({
      where: {
        deletedAt: null,
        OR: [{ name: { contains: query } }, { slug: { contains: query } }],
      },
    })
  }

  async findInviteById(id: number) {
    return this.prisma.spaceInvite.findUnique({
      where: { id },
    })
  }

  async findUserById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    })
  }

  async updateMemberStatusAndRole(
    spaceId: number,
    userId: number,
    status: SpaceMemberStatus,
    role: SpaceRole,
    invitedBy?: number,
    joinRequestMessage?: string | null,
  ) {
    return this.prisma.spaceMember.update({
      where: {
        uq_space_user: { spaceId, userId },
      },
      data: { status, role, invitedBy, joinRequestMessage },
    })
  }

  async findSpaceIdByUuid(uuid: string): Promise<number | null> {
    const space = await this.prisma.space.findUnique({
      where: { uuid, deletedAt: null },
      select: { id: true },
    })
    return space ? space.id : null
  }

  async findById(id: number) {
    return this.prisma.space.findUnique({
      where: { id, deletedAt: null },
    })
  }

  async findSentRequests(userId: number, dto: PaginationDto) {
    const where: Prisma.SpaceMemberWhereInput = {
      userId,
      status: {
        in: [SpaceMemberStatus.PENDING, SpaceMemberStatus.REJECTED],
      },
      space: {
        deletedAt: null,
      },
    }

    return paginate(
      this.prisma.spaceMember,
      { page: dto.page, limit: dto.limit },
      {
        where,
        include: {
          space: true,
          inviter: {
            select: {
              email: true,
              profile: {
                select: {
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      },
    )
  }
}
