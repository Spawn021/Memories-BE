import { SetMetadata } from '@nestjs/common'
import { SpaceRole } from '../../../generated/prisma/client'

export const SPACE_ROLES_KEY = 'space_roles'
export const RolesInSpace = (...roles: SpaceRole[]) => SetMetadata(SPACE_ROLES_KEY, roles)
