declare const provider: {
  init(providerOptions?: Record<string, unknown>): {
    upload(file: Record<string, unknown>): Promise<void>;
    uploadStream(file: Record<string, unknown>): Promise<void>;
    delete(file: Record<string, unknown>): Promise<void>;
    isPrivate(): boolean;
    getSignedUrl(file: Record<string, unknown>): Promise<Record<string, unknown>>;
    healthCheck(): Promise<void>;
  };
};

export default provider;
