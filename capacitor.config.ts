import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.admindoitnow',
  appName: 'admin-doitnow',
  webDir: 'www',
  plugins: {
    GoogleAuth: {
      clientId: '298547120620-p9umkah0rn919s76vf0vhse8ntovr2qf.apps.googleusercontent.com',
      scopes: 'email,profile,openid',
    },
  },
};

export default config;
