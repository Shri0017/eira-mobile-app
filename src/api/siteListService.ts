import { API_CONFIG } from "@/constants";
import { api } from "./index";
import { getUserId } from "@/utils/storage";

const SiteListService = {
  getDashboardDetailsByUserId: async (): Promise<any> => {
    const userId = await getUserId();
    const response = await api.get<any>(`${API_CONFIG.API_BASE_URL}/siteList/dashboardDetailsByUserId/${userId}`);
    return response;
  },
  getSiteListByUserId: async (): Promise<any> => {
    const userId = await getUserId();
    const response = await api.get<any>(`${API_CONFIG.API_BASE_URL}/siteList/loadSiteList/${userId}`);
    return response;
  },
};
export default SiteListService;