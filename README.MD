# ReelSteady Joiner

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate?hosted_button_id=P9JH3CF5DHEJW)

_Join your video files extracted from GoPro without losing quality or gyroscope data, then stabilize it with ReelSteady_

_Perfect for long videos like long range drone footage_ 

_**INFO**: At the moment only available for use on Windows_

## Starting 🚀

### Installation and usage 🔧

_Download and execute installer (**[Releases tab](https://github.com/rubegartor/ReelSteady-Joiner/releases)**) or build source code and execute it_

1. Choose your settings

![Settings](https://i.imgur.com/VexTdCe.png)

2. Select all of your mp4 files to concatenate (Normally 4GB chunks or less) and start merge process
   1. AutoScan Option let you find chapters easily
   
![Select files](https://i.imgur.com/qnm3rgY.png)
![Select files](https://i.imgur.com/Mq3yGrU.png)
   

3. Let ReelSteady Joiner work and combine all the videos selected

![Processing videos](https://i.imgur.com/XSnzJk5.png)
   

4. Check the output video file and stabilize it with ReelSteady

![Finished](https://i.imgur.com/Na6SPfV.png)

**Warning**: If you process parts that do not belong to the same run, the final video file will be corrupted

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

## Authors ✒️

* **Rubén García** - [rubegartor](https://github.com/rubegartor)

## License 📄

This project is under the License (MIT) - [LICENSE.MD](LICENSE.MD) for more details
