export function hardwareId(hardwareAddress: string, trackerNum: number) {
  return `${hardwareAddress}/${trackerNum}`;
}
