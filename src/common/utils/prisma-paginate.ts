export interface PaginateOptions {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  items: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * Helper to paginate any Prisma model delegate.
 */
export async function paginate<T, Args>(
  model: {
    count: (args: { where?: any }) => Promise<number>
    findMany: (args: Args) => Promise<T[]>
  },
  paginateOptions: PaginateOptions,
  queryOptions: Omit<Args, 'take' | 'skip'> = {} as any,
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, paginateOptions.page || 1)
  const limit = Math.max(1, Math.min(100, paginateOptions.limit || 20))

  const countArgs = { where: (queryOptions as any).where }
  const findManyArgs = {
    ...(queryOptions as any),
    take: limit,
    skip: (page - 1) * limit,
  }

  const [total, items] = await Promise.all([model.count(countArgs), model.findMany(findManyArgs)])

  return {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}
