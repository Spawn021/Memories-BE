import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common'
import type { Request } from 'express'
import { SpacesService } from './spaces.service'
import { CreateSpaceDto } from './dto/create-space.dto'
import { UpdateSpaceDto } from './dto/update-space.dto'
import { UpdateMemberRoleDto } from './dto/update-member-role.dto'
import { CreateInviteDto } from './dto/create-invite.dto'
import { AcceptInviteDto } from './dto/accept-invite.dto'
import { JoinRequestDto } from './dto/join-request.dto'
import { GetSpaceMembersDto } from './dto/get-space-members.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { SpaceMemberStatus, SpaceRole } from '../../../generated/prisma/client'
import { SpaceRoleGuard } from '../../common/guards/space-role.guard'
import { RolesInSpace } from '../../common/decorators/space-roles.decorator'

import { GetSpacesDto } from './dto/get-spaces.dto'
import { GetSentRequestsDto } from './dto/get-sent-requests.dto'

export interface RequestWithSpaceRole extends Request {
  spaceId: number
  spaceMember: { role: SpaceRole; status: SpaceMemberStatus }
  user: {
    id: number
    email: string
    displayName?: string
    username?: string
  }
}

@Controller('spaces')
export class SpacesController {
  constructor(private spacesService: SpacesService) {}

  @Post()
  async create(@Body() dto: CreateSpaceDto, @CurrentUser('id') userId: number) {
    return this.spacesService.create(dto, userId)
  }

  @Get()
  async findAll(@CurrentUser('id') userId: number, @Query() dto: GetSpacesDto) {
    return this.spacesService.findAllForUser(userId, dto)
  }

  @Get('search')
  async search(@Query('q') q: string) {
    return this.spacesService.search(q || '')
  }

  @Get('requests/sent')
  async findSentRequests(@CurrentUser('id') userId: number, @Query() dto: GetSentRequestsDto) {
    return this.spacesService.findSentRequests(userId, dto)
  }

  @Get(':uuid')
  async findOne(@Param('uuid') uuid: string, @CurrentUser('id') userId: number) {
    return this.spacesService.findOne(uuid, userId)
  }

  @Patch(':uuid')
  @UseGuards(SpaceRoleGuard)
  @RolesInSpace(SpaceRole.ADMIN)
  async update(@Param('uuid') uuid: string, @Body() dto: UpdateSpaceDto) {
    return this.spacesService.update(uuid, dto)
  }

  @Delete(':uuid')
  @UseGuards(SpaceRoleGuard)
  @RolesInSpace(SpaceRole.OWNER)
  async remove(@Param('uuid') uuid: string) {
    return this.spacesService.remove(uuid)
  }

  @Get(':uuid/members')
  @UseGuards(SpaceRoleGuard)
  async findMembers(@Query() query: GetSpaceMembersDto, @Req() req: RequestWithSpaceRole) {
    return this.spacesService.findMembers(req.spaceId, req.spaceMember.role, query)
  }

  @Patch(':uuid/members/:memberUserId/role')
  @UseGuards(SpaceRoleGuard)
  @RolesInSpace(SpaceRole.ADMIN)
  async updateMemberRole(
    @Param('memberUserId') memberUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Req() req: RequestWithSpaceRole,
  ) {
    return this.spacesService.updateMemberRole(
      req.spaceId,
      parseInt(memberUserId, 10),
      dto,
      req.user.id,
      req.spaceMember.role,
    )
  }

  @Delete(':uuid/members/:memberUserId')
  @UseGuards(SpaceRoleGuard)
  async removeMember(
    @Param('memberUserId') memberUserId: string,
    @Req() req: RequestWithSpaceRole,
  ) {
    return this.spacesService.removeMember(
      req.spaceId,
      parseInt(memberUserId, 10),
      req.user.id,
      req.spaceMember.role,
    )
  }

  @Post(':uuid/invites')
  @UseGuards(SpaceRoleGuard)
  @RolesInSpace(SpaceRole.ADMIN)
  async createInvite(@Body() dto: CreateInviteDto, @Req() req: RequestWithSpaceRole) {
    const inviterName = req.user.displayName || req.user.username || req.user.email
    return this.spacesService.createInvite(req.spaceId, dto, req.user.id, inviterName)
  }

  @Public()
  @Get('invites/validate')
  async validateInvite(@Query('token') token: string) {
    return this.spacesService.validateInvite(token)
  }

  @Post('invites/accept')
  async acceptInvite(@Body() dto: AcceptInviteDto, @CurrentUser('id') userId: number) {
    return this.spacesService.acceptInvite(dto.token, userId, dto.message)
  }

  @Post(':uuid/join-request')
  async requestToJoin(
    @Param('uuid') uuid: string,
    @Body() dto: JoinRequestDto,
    @CurrentUser('id') userId: number,
  ) {
    return this.spacesService.requestToJoin(uuid, userId, dto.message || undefined)
  }

  @Delete(':uuid/join-request')
  async withdrawJoinRequest(@Param('uuid') uuid: string, @CurrentUser('id') userId: number) {
    await this.spacesService.withdrawJoinRequest(uuid, userId)
    return { message: 'Join request withdrawn successfully.' }
  }

  @Post(':uuid/members/:memberUserId/approve')
  @UseGuards(SpaceRoleGuard)
  @RolesInSpace(SpaceRole.ADMIN)
  async approveMember(
    @Param('memberUserId') memberUserId: string,
    @Req() req: RequestWithSpaceRole,
  ) {
    return this.spacesService.approveMember(req.spaceId, parseInt(memberUserId, 10))
  }

  @Post(':uuid/members/:memberUserId/reject')
  @UseGuards(SpaceRoleGuard)
  @RolesInSpace(SpaceRole.ADMIN)
  async rejectMember(
    @Param('memberUserId') memberUserId: string,
    @Req() req: RequestWithSpaceRole,
  ) {
    return this.spacesService.rejectMember(req.spaceId, parseInt(memberUserId, 10))
  }

  @Post(':uuid/invites/:inviteId/revoke')
  @UseGuards(SpaceRoleGuard)
  @RolesInSpace(SpaceRole.ADMIN)
  async revokeInvite(@Param('inviteId') inviteId: string, @Req() req: RequestWithSpaceRole) {
    return this.spacesService.revokeInvite(req.spaceId, parseInt(inviteId, 10))
  }
}
