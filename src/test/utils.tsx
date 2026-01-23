import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 创建一个新的 QueryClient 实例用于测试
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // 测试中关闭重试
    },
  },
});

export const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};
