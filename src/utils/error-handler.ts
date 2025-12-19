/**
 * 统一错误处理工具
 *
 * 提供统一的错误处理逻辑，包括错误包装、日志记录和状态管理
 */

export interface ErrorHandlerOptions {
  /** 操作名称，用于日志和错误消息 */
  operation: string;
  /** 上下文信息，用于更详细的错误描述 */
  context?: string;
  /** 错误回调函数，用于设置错误状态 */
  onError?: (error: string) => void;
  /** 日志级别 */
  logLevel?: 'error' | 'warn' | 'info';
  /** 是否可重试 */
  retryable?: boolean;
}

/**
 * 统一错误处理器类
 */
export class UnifiedErrorHandler {
  /**
   * 异步操作错误边界包装器
   *
   * @param operation 要执行的异步操作
   * @param options 错误处理选项
   * @returns 操作结果或 null（如果发生错误）
   */
  static async withErrorBoundary<T>(
    operation: () => Promise<T>,
    options: ErrorHandlerOptions,
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.handleServiceError(error, options);
      return null;
    }
  }

  /**
   * 处理服务错误
   *
   * @param error 错误对象
   * @param options 错误处理选项
   */
  static handleServiceError(
    error: unknown,
    options: ErrorHandlerOptions,
  ): never {
    const errorMessage = this.extractErrorMessage(error, options.operation);

    // 记录日志
    this.logError(error, options);

    // 调用错误回调
    if (options.onError) {
      options.onError(errorMessage);
    }

    // 抛出标准化错误
    throw new Error(errorMessage);
  }

  /**
   * 创建错误包装器工厂函数
   *
   * @param operation 操作名称
   * @param setError 设置错误状态的函数
   * @returns 错误包装器函数
   */
  static createErrorWrapper(
    operation: string,
    setError?: (msg: string) => void,
  ): (error: unknown) => never {
    return (error: unknown) => {
      const errorMessage = this.extractErrorMessage(error, operation);

      // 设置错误状态
      if (setError) {
        setError(errorMessage);
      }

      // 记录日志
      console.error(`${operation}失败:`, error);

      // 抛出标准化错误
      throw new Error(errorMessage);
    };
  }

  /**
   * 提取错误消息
   *
   * @param error 错误对象
   * @param operation 操作名称
   * @returns 标准化的错误消息
   */
  private static extractErrorMessage(
    error: unknown,
    operation: string,
  ): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    // 处理可能的对象错误
    if (error && typeof error === 'object' && 'message' in error) {
      return String((error as { message: unknown }).message);
    }

    // 默认错误消息
    return `${operation}失败`;
  }

  /**
   * 记录错误日志
   *
   * @param error 错误对象
   * @param options 错误处理选项
   */
  private static logError(error: unknown, options: ErrorHandlerOptions): void {
    const { operation, context, logLevel = 'error' } = options;

    const logMessage = context
      ? `${operation}失败 (${context}):`
      : `${operation}失败:`;

    switch (logLevel) {
      case 'error':
        console.error(logMessage, error);
        break;
      case 'warn':
        console.warn(logMessage, error);
        break;
      case 'info':
        console.info(logMessage, error);
        break;
    }
  }
}

/**
 * 便捷的错误处理函数
 */

/**
 * 处理 Store 操作错误的便捷函数
 *
 * @param error 错误对象
 * @param operation 操作名称
 * @param setError 设置错误状态的函数
 */
export function handleStoreError(
  error: unknown,
  operation: string,
  setError: (msg: string) => void,
): void {
  const errorWrapper = UnifiedErrorHandler.createErrorWrapper(
    operation,
    setError,
  );
  try {
    errorWrapper(error);
  } catch {
    // 错误已经被处理和记录
  }
}

/**
 * 处理组件操作错误的便捷函数
 *
 * @param error 错误对象
 * @param operation 操作名称
 * @param setError 设置错误状态的函数
 * @param context 上下文信息
 */
export function handleComponentError(
  error: unknown,
  operation: string,
  setError: (msg: string) => void,
  context?: string,
): void {
  UnifiedErrorHandler.handleServiceError(error, {
    operation,
    context,
    onError: setError,
    logLevel: 'error',
  });
}

/**
 * 异步操作的错误处理装饰器
 *
 * @param operation 操作名称
 * @param setError 设置错误状态的函数
 * @returns 装饰器函数
 */
export function withAsyncErrorHandling<T extends unknown[], R>(
  operation: string,
  setError: (msg: string) => void,
) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: T) => Promise<R>>,
  ) {
    const originalMethod = descriptor.value;

    if (!originalMethod) {
      return descriptor;
    }

    descriptor.value = async function (...args: T): Promise<R> {
      try {
        setError(''); // 清除之前的错误
        return await originalMethod.apply(this, args);
      } catch (error) {
        handleStoreError(error, operation, setError);
        throw error; // 重新抛出错误而不是返回 null
      }
    };

    return descriptor;
  };
}
