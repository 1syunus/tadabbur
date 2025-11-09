import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

/**
 * Creates a mock Supabase client with chainable methods.
 * @param mockData Data to return from queries
 * @param mockError Optional error to simulate
 * @param mockUser Optional user for auth mocking (default: mock-user-id)
 * @returns jest.Mocked<SupabaseClient<Database>>
 */

interface ChainableQuery {
  select: jest.Mock<any, any>;
  insert: jest.Mock<any, any>;
  update: jest.Mock<any, any>;
  delete: jest.Mock<any, any>;
  eq: jest.Mock<any, any>;
  is: jest.Mock<any, any>;
  not: jest.Mock<any, any>;
  order: jest.Mock<any, any>;
  limit: jest.Mock<any, any>;
  single: jest.Mock<any, any>;
  maybeSingle: jest.Mock<any, any>;
}

// supabase response
interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
  status: number;
  statusText: string;
  count: number | null;
}

export const createMockSupabaseClient = <T = any>(
    mockData: T | null = null,
    mockError: Error | null = null,
    mockUser: {id: string} =  {id: "mock-user-id"},
): jest.Mocked<SupabaseClient<Database>> => {
    // helper for std response
    const createResult = () => ({
        data: mockData,
        error: mockError,
        status: mockError ? 400 : 200,
        statusText: mockError ? "Bad Request" : "OK",
        count: null,
    })

    const finalizer = jest.fn().mockResolvedValue(createResult())

    const chainable: ChainableQuery = {
        select: jest.fn((_columns?: string, options?: {count?: string; head?: boolean}) => {
            // count query sim
            if (options?.count === "exact" && options?.head) {
                return Promise.resolve({
                    count: mockData ? (Array.isArray(mockData) ? mockData.length : 1) : 0,
                    error: mockError,
                    status: mockError ? 400 : 200,
                })
            }
            return chainable
        }),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        is: jest.fn().mockReturnThis(),
        not: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: finalizer,
        maybeSingle: finalizer,
    }

    const mockClient: Partial<jest.Mocked<SupabaseClient<Database>>> = {
        from: jest.fn().mockImplementation((_table: string) => chainable),
        auth: {
            getUser: jest.fn().mockResolvedValue({
                data: {user: mockUser},
                error: null,
            }),
            getSession: jest.fn().mockResolvedValue({
                data: {session: {user: mockUser}},
                error: null,
            }),
        },
    } as any
    
    return mockClient as jest.Mocked<SupabaseClient<Database>>
}