# ReelSteady Joiner

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate?hosted_button_id=P9JH3CF5DHEJW)

_Merge your video files extracted from GoPro without losing quality or gyroscope data, then stabilize it with ReelSteady_

_Perfect for long videos like long range drone footage_

Supported on **Windows** & **MacOS** with GoPro Hero 6, 7, 8, 9, 10 and MAX

## Starting 🚀

### Installation and usage 🔧

_Download and execute installer (**[Releases tab](https://github.com/rubegartor/ReelSteady-Joiner/releases)**) or build source code and execute it_

1. Choose your settings

![Settings](https://i.imgur.com/A3vTKBF.png)

2. Select all of your mp4/360 files to concatenate (Normally 4GB chunks or less) and start merge process

![Select files](https://i.imgur.com/na3SE7l.png)
![Select files](https://i.imgur.com/zMIcsCo.png)

3. Customize your projects

![Customize](https://i.imgur.com/wdao3Gz.png)

4. Let ReelSteady Joiner work and combine all the videos

![Processing videos](https://i.imgur.com/Gjawlv7.png)

---

### Troubleshooting 🔎
_(Known issues and recommendations)_

- If you are running ReelSteady Joiner on macOS you will need to give security permissions to udtacopy first time you use it.
  Popup will appear, go System Preferences > Security & privacy and click button: Open anyway.

- Antiviruses could interfere with file manipulation, if you have troubles, try to disable it

- MacOS ARM builds are having issues on certain devices, the issue has not yet been identified. [#26](https://github.com/rubegartor/ReelSteady-Joiner/issues/26)

### Update ReelSteady Joiner ⚙️

_Simple, just download and run the installer for the new version._

### Pre-requisites for development 📋

_Required dependencies_

```
nodejs
npm dependencies listed in package.json
```

## Built with 🛠️

* [Electron](https://www.electronjs.org/) - ElectronJS Framework
* [ffmpeg](http://ffmpeg.org/) - FFmpeg
* [exiftool](https://exiftool.org/) - ExifTool
* [GoProLabs](https://gopro.github.io/labs/) - GoProLabs utils

ReelSteady Joiner is only a wrapper application for GoProLabs "udtacopy" feature, thanks to [dnewman-gpsw](https://github.com/dnewman-gpsw) and [GoProLabs](https://github.com/gopro/labs) for creating udtacopy.

## Authors ✒️

* **Rubén García** - [rubegartor](https://github.com/rubegartor)

## License 📄

This project is under the License (MIT) - [LICENSE.MD](LICENSE.MD) for more details
