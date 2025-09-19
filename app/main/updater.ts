import { autoUpdater } from 'electron-updater';

export const setupUpdater = (): void => {
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info: any) => {
    console.log('Update available:', info);
  });

  autoUpdater.on('update-not-available', (info: any) => {
    console.log('Update not available:', info);
  });

  autoUpdater.on('error', (err: any) => {
    console.error('Auto-updater error:', err);
  });

  autoUpdater.on('download-progress', (progressObj: any) => {
    const logMessage = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}% (${progressObj.transferred}/${progressObj.total})`;
    console.log(logMessage);
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    console.log('Update downloaded:', info);
    autoUpdater.quitAndInstall();
  });

  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60000 * 60); // Check every hour
};