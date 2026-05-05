import { api } from './index';
import { getUserId, storage } from '../utils/storage';
import { API_CONFIG, STORAGE_KEYS } from '../constants';

const AnalyticsService = {

    findSiteListByUserId: async (): Promise<any> => {
        const userId = await getUserId();
        const response = await api.get<any>(`${API_CONFIG.API_BASE_URL}/sitedetails/findSiteList/${userId}`);
        return response;
    },
    findEquiDropdownListBySiteId: async ({ siteId }: { siteId: string }): Promise<any> => {
        const response = await api.get<any>(`${API_CONFIG.API_BASE_URL}/equipmentMaster/findEquiDropdownListBySiteId/${siteId}`);
        return response;
    },
    getDailyKeyMetrics: async (data: any): Promise<any> => {
        const response = await api.post<any>(`${API_CONFIG.API_COLLECTION_URL}/activePowerData`, data);
        return response;
    },
    getWeeklyAndYearlyKeyMetrics: async (data: any): Promise<any> => {
        const response = await api.post<any>(`${API_CONFIG.API_COLLECTION_URL}/getWeeklyAndYearlyGenData`, data);
        return response;
    },
    getSpecificYield: async (data: any): Promise<any> => {
        const response = await api.post<any>(`${API_CONFIG.API_COLLECTION_URL}/getSpecificYield`, data);
        return response;
    },
    getDgPvGridManagement: async (data: any): Promise<any> => {
        const response = await api.post<any>(`${API_CONFIG.API_PVDGGRID_URL}/pvdggrid/getValue`, data);
        return response;
    },
    getStringCurrent: async (data: any): Promise<any> => {
        const response = await api.post<any>(`${API_CONFIG.API_COLLECTION_URL}/parameterComparision`, data);
        return response;
    },
};

export default AnalyticsService;