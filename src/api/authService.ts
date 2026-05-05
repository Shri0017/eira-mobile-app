import {api} from './index';
import {storage} from '../utils/storage';
import {API_CONFIG, STORAGE_KEYS} from '../constants';

interface LoginRequest {
  deviceType: string;
  email: string;
  password: string;
}


  
const AuthService = {
  login: async (credentials: LoginRequest): Promise<any> => {
    const data = await api.post<any>(`${API_CONFIG.API_BASE_URL}/login`, credentials);
    await storage.set(STORAGE_KEYS.ACCESS_TOKEN, data.accesstoken);
    await storage.set(STORAGE_KEYS.REFRESH_TOKEN, data.refreshToken);
    await storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(data));
    return data;
  },
};

export default AuthService;
