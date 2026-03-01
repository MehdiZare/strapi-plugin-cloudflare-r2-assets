import type { ProviderUploadFile, RawPluginConfig } from '../shared/types';

declare const provider: {
  init(providerOptions?: RawPluginConfig): {
    upload(file: ProviderUploadFile): Promise<void>;
    uploadStream(file: ProviderUploadFile): Promise<void>;
    delete(file: ProviderUploadFile): Promise<void>;
    isPrivate(): boolean;
    getSignedUrl(file: ProviderUploadFile): Promise<ProviderUploadFile>;
    healthCheck(): Promise<void>;
  };
};

export declare const init: typeof provider.init;
export default provider;
