# ReelSteady Joiner

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate?hosted_button_id=P9JH3CF5DHEJW)

_Merge your video files extracted from GoPro without losing quality or gyroscope data, then stabilize it with
ReelSteady_

_Perfect for long videos like long range drone footage_

Supported on **Windows** & **MacOS** with GoPro Hero 5, 6, 7, 8, 9, 10, 11, 12 and MAX

## Starting 🚀

### Installation and usage 🔧

_Download and execute installer (**[Releases tab](https://github.com/rubegartor/ReelSteady-Joiner/releases)**) or build
source code and execute it_

**IMPORTANT!!** It's absolutely necessary that the video files keep their original names, otherwise ReelSteady Joiner
will not be able to find them.

1. Choose your settings
1. Projects queue option higher than 1 is not recommended when using HDD instead of SSD
1. Processing type:
   1. MP4Merge (recommended)
   2. FFmpeg
1. Project save path options:
   1. **Select project save path**: Specify the path where the output video will be stored
   2. **Export to source path**: The output video will automatically be stored at the same location of the origin video

![Settings](assets/settings.png)

2. Select the folder containing mp4/360 files to concatenate (Normally 4GB chunks or less) (ReelSteady Joiner will take
   care of finding the files) and start merge process (You can delete or open projects by right-clicking on them)

![Select files](assets/select_files.png)

3. Let ReelSteady Joiner work and combine all the videos

![Processing videos](assets/processing.png)

---

### Troubleshooting 🔎

_(Known issues and recommendations)_

- If you are running ReelSteady Joiner on macOS you will need to give security permissions to udtacopy first time you
  use it.
  Popup will appear, **go System Preferences > Security & privacy and click button: Open anyway.**

- Antiviruses could interfere with file manipulation, if you have troubles, try to disable it

### Update ReelSteady Joiner ⚙️

_Simple, just download and run the installer for the new version._

### Pre-requisites for development 📋

_Required dependencies_

```
nodejs
npm dependencies listed in package.json
```

## Built with 🛠️

- [Electron](https://www.electronjs.org/) - ElectronJS Framework
- [React](https://reactjs.org/) - ReactJS
- [Ffmpeg](http://ffmpeg.org/) - FFmpeg
- [GoProLabs](https://gopro.github.io/labs/) - GoProLabs utils
- [MP4Merge](https://github.com/gyroflow/mp4-merge) - MP4Merge (gyroflow)

## Authors ✒️

- **Rubén García** - [rubegartor](https://github.com/rubegartor)

## License 📄

This project is under the License (MIT) - [LICENSE.MD](LICENSE.MD) for more details
