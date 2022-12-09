import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import { UsageState } from '@/Interface';
import { activateLicenseKey, getLicense, renewLicense } from '@/api/usage';
import { useRootStore } from '@/stores/n8nRootStore';
import { useSettingsStore } from "@/stores/settings";
import { useUsersStore } from "@/stores/users";

const SUBSCRIPTION_APP_URL = 'https://n8n-io.github.io/subscription-app';
const DEFAULT_PLAN_ID = 'community';
const DEFAULT_PLAN_NAME = 'Community';
const DEFAULT_STATE: UsageState = {
	loading: true,
	error: null,
	data: {
		usage: {
			executions: {
				limit: -1,
				value: 0,
				warningThreshold: .8,
			},
		},
		license: {
			planId: DEFAULT_PLAN_ID,
			planName: DEFAULT_PLAN_NAME,
		},
	},
};

export const useUsageStore = defineStore('usage', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();
	const usersStore = useUsersStore();

	const state = reactive<UsageState>(DEFAULT_STATE);

	const setData = (data: UsageState['data']) => {
		state.data = data;
	};

	const getData = async () => {
		state.loading = true;
		try {
			const { data } = await getLicense(rootStore.getRestApiContext);
			setData(data);
		} catch (error) {
			state.error = error;
		}
		state.loading = false;
	};

	const activateLicense = async (activationKey: string) => {
		state.loading = true;
		try {
			const { data } = await activateLicenseKey(rootStore.getRestApiContext, { activationKey });
			setData(data);
		} catch (error) {
			state.error = error;
		}
		state.loading = false;
	};

	const refreshLicenseManagementToken = async () => {
		state.loading = true;
		try {
			const { data } = await renewLicense(rootStore.getRestApiContext);
			setData(data);
		} catch (error) {
			state.error = error;
		}
		state.loading = false;
	};

	return {
		getData,
		setData,
		activateLicense,
		refreshLicenseManagementToken,
		isLoading: computed(() => state.loading),
		planName: computed(() => state.data.license.planName || DEFAULT_PLAN_NAME),
		executionLimit: computed(() => state.data.usage.executions.limit),
		executionCount: computed(() => state.data.usage.executions.value),
		isCloseToLimit: computed(() => state.data.usage.executions.limit < 0 ? false :  state.data.usage.executions.value / state.data.usage.executions.limit >= state.data.usage.executions.warningThreshold),
		instanceId: computed(() => settingsStore.settings.instanceId),
		managementToken: computed(() => state.data.managementToken),
		viewPlansUrl: computed(() => `${SUBSCRIPTION_APP_URL}?instanceId=${settingsStore.settings.instanceId}`),
		managePlansUrl: computed(() => `${SUBSCRIPTION_APP_URL}/manage?token=${state.data.managementToken}`),
		canUserActivateLicense: computed(() => usersStore.canUserActivateLicense),
	};
});