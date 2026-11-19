declare module "@cloudbase/js-sdk-v3" {
  const cloudbase: {
    init(options: { env: string; accessKey?: string }): any;
  };
  export default cloudbase;
}
