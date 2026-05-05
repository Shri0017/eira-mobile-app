import {useState, useCallback} from 'react';
import {api} from '../api';
import {AxiosRequestConfig} from 'axios';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (config?: AxiosRequestConfig) => Promise<T | null>;
  reset: () => void;
}

export function useApi<T>(
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  url: string,
  initialData?: unknown,
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (config?: AxiosRequestConfig): Promise<T | null> => {
      setState(prev => ({...prev, loading: true, error: null}));

      try {
        let response: T;

        switch (method) {
          case 'get':
            response = await api.get<T>(url, config);
            break;
          case 'post':
            response = await api.post<T>(url, initialData, config);
            break;
          case 'put':
            response = await api.put<T>(url, initialData, config);
            break;
          case 'patch':
            response = await api.patch<T>(url, initialData, config);
            break;
          case 'delete':
            response = await api.delete<T>(url, config);
            break;
        }

        setState({data: response, loading: false, error: null});
        return response;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('An error occurred');
        setState({data: null, loading: false, error: err});
        return null;
      }
    },
    [method, url, initialData],
  );

  const reset = useCallback(() => {
    setState({data: null, loading: false, error: null});
  }, []);

  return {...state, execute, reset};
}
