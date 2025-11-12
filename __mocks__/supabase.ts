export function createMockSupabaseClient(
  mockData: any = null,
  mockError: any = null,
  mockCount: number | null = null
) {
  // Store the final result
  let finalCount = mockCount ?? (Array.isArray(mockData) ? mockData.length : mockData ? 1 : 0)
  let finalData = mockData
  let finalError = mockError

  // Create chainable mock that tracks method calls
  const chain = {
    // Query methods
    select: jest.fn(function(this: any, columns?: string, options?: any) {
        this.lastSelect = columns
      // If head: true, we're doing a count query
      if (options?.head) {
        finalData = null
      }
      return this
    }),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn(function(this: any) {
        this.lastMethod = 'delete'
        return this
    }),
    upsert: jest.fn().mockReturnThis(),

    // Filter methods
    eq: jest.fn(function(){
        if (this.lastMethod === 'delete') {
            return Promise.resolve({data: null, error: finalError})
        }
        return this
    }),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),

    // Modifiers
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    
    // Terminators
    single: jest.fn(() => {
        const data = Array.isArray(finalData) ? finalData[0] : finalData
        return Promise.resolve({ data, error: finalError })
    }),
    maybeSingle: jest.fn(() => 
        Promise.resolve({ data: finalData, error: finalError })
    ),
  }

  // Make the chain thenable (implicit promise)
  Object.assign(chain, {
    then(resolve: any, reject: any) {
      const result = { 
        data: finalData, 
        error: finalError,
        count: finalCount,
        status: finalError ? 400 : 200,
        statusText: finalError ? 'Bad Request' : 'OK'
      }
      return Promise.resolve(result).then(resolve, reject)
    },
    catch(reject: any) {
      return Promise.resolve({ data: finalData, error: finalError }).catch(reject)
    },
    finally(fn: any) {
      return Promise.resolve({ data: finalData, error: finalError }).finally(fn)
    },
  })

  return {
    from: jest.fn(() => chain),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  } as any
}