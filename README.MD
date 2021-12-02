# ReelSteady Joiner

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate?hosted_button_id=P9JH3CF5DHEJW)

_Merge your video files extracted from GoPro without losing quality or gyroscope data, then stabilize it with ReelSteady_

_Perfect for long videos like long range drone footage_

Supported on **Windows** & **MacOS**

## Starting 🚀

### Installation and usage 🔧

_Download and execute installer (**[Releases tab](https://github.com/rubegartor/ReelSteady-Joiner/releases)**) or build source code and execute it_

1. Choose your settings

![Settings](https://i.imgur.com/FsEBUaB.png)

2. Select all of your mp4 files to concatenate (Normally 4GB chunks or less) and start merge process
   1. AutoScan Option let you find chapters easily

![Select files](https://i.imgur.com/Bv18QPR.png)
![Select files](https://i.imgur.com/iXB6pzW.png)


3. Let ReelSteady Joiner work and combine all the videos selected

![Processing videos](https://i.imgur.com/DN27x4R.png)


4. Check the output video file and stabilize it with ReelSteady

![Finished](https://i.imgur.com/rx6jk6W.png)

**Warning**: If you process parts that do not belong to the same run, the final video file will be corrupted (this will not happen with auto scan option enabled)

### Troubleshooting 🔎
_(Known issues and recommendations)_

- If you are running ReelSteady Joiner on macOS you will need to give security permissions to udtacopy first time you use it.
  Popup will appear, go System Preferences > Security & privacy and click button: Open anyway.

- Antiviruses could interfere with file manipulation, if you have troubles, try to disable it

- It's mandatory that the files keep their original names in order to be manipulated correctly
  - Without AutoScan option enabled, it may work if the video names correspond alphabetically to the recording order

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
