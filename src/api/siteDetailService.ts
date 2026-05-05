import { API_CONFIG } from "@/constants";
import { api } from "./index";

const SiteDetailService = {
  getSiteDetailOverview: async (siteId: string): Promise<any> => {
    const response = await api.get<any>(`${API_CONFIG.API_BASE_URL}/siteList/getSiteList/${siteId}`);
    return response;
  },
  getSiteDetailOverviewEquipmentListBySiteId: async (siteId: string): Promise<any> => {
    const response = await api.get<any>(`${API_CONFIG.API_BASE_URL}/equipmentMaster/findEquiDropdownListBySiteId/${siteId}`);
    return response;
  },
  getSiteDetailEnergyPerformance: async (data: any): Promise<any> => {
    const response = await api.post<any>(`${API_CONFIG.API_COLLECTION_URL}/getEnergyPerformance`, data);
    return response;
  },
  getSiteDetailParameterComparision: async (data: any): Promise<any> => {
    const response = await api.post<any>(`${API_CONFIG.API_COLLECTION_URL}/parameterComparision`, data);
    return response;
  },
  getSiteDetailInverters: async (siteId: string, irradiation: string): Promise<any> => {
    const response = await api.get<any>(`${API_CONFIG.API_BASE_URL}/siteList/equipmentListBySiteId/${siteId}/${irradiation}`);
    return response;
  },
  getSiteDetailStrings: async (equipmentIds: string): Promise<any> => {
    const response = await api.get<any>(`${API_CONFIG.API_COLLECTION_URL}/getStringCurrentDetails?equipmentIds=${equipmentIds}`);
    return response;
  },
  getSiteDetailMeters: async (siteId: string): Promise<any> => {
    const response = await api.get<any>(`${API_CONFIG.API_BASE_URL}/siteList/getEnergyMeterBySite/${siteId}`);
    return response;
  },
  getSiteDetailAlarms: async (siteId: string): Promise<any> => {
    const response = await api.get<any>(`${API_CONFIG.API_BASE_URL}/siteList/findErrorListBySiteId/${siteId}`);
    return response;
  },
};

export default SiteDetailService;