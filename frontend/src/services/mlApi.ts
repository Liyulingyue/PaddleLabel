import axios from 'axios';

const createModelApi = (baseURL: string = 'http://localhost:1234') => {
  const client = axios.create({
    baseURL,
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' },
  });

  return {
    async getAll() {
      const res = await client.get('/');
      return res.data as Model[];
    },

    async load(modelName: string, params?: { initParams?: object }) {
      await client.post(`/${modelName}/load`, params || {});
    },

    async predict(modelName: string, data: { format: string; img: string; other?: object }) {
      const res = await client.post(`/${modelName}/predict`, data);
      return res.data;
    },

    async train(modelName: string, data: { dataDir: string; configs: object }) {
      await client.post(`/${modelName}/train`, data);
    },

    async unload(modelName: string) {
      await client.get(`/${modelName}/unload`);
    },

    async isBackendUp() {
      const res = await client.get('/running');
      return res.data;
    },
  };
};

export interface Model {
  name?: string;
  type?: string;
}

export const ModelApi = {
  create: createModelApi,
};
