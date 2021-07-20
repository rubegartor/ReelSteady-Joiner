# ReelSteady Joiner

_Join your video files extracted from GoPro without losing quality or gyroscope data, then stabilize it with ReelSteady_

_Perfect for long videos like long range drone footage_ 

_**INFO**: At the moment only available for use on Windows_

## Starting 🚀

### Installation and usage 🔧

_Download and execute installer (**[Releases tab](https://github.com/rubegartor/ReelSteady-Joiner/releases)**) or build source code and execute it_

1. Select all of your mp4 files to concatenate (Normally 4GB chunks or less) and start merge process
![Select files](https://i.imgur.com/ISKlivb.png)
![Select files](https://i.imgur.com/6n8LBA5.png)
   

2. Let ReelSteady Joiner work and combine all the videos selected above
   (You can track the progress with total time of video processed)
![Processing videos](https://i.imgur.com/31hOm34.png)
   

3. Check the output video file and stabilize it with ReelSteady
![Finished](https://i.imgur.com/gKsuuha.png)

**Warning**: If you process parts that do not belong to the same run, the final video file will be corrupted

### Pre-requisites for development 📋

_Required dependencies_

```
nodejs
npm dependencies listed in package.json
```

## Built with 🛠️

* [Electron](https://www.electronjs.org/) - ElectronJS Framework
* [ffmpeg](http://ffmpeg.org/) - FFmpeg
* [GoProLabs](https://gopro.github.io/labs/) - GoProLabs utils

## Authors ✒️

* **Rubén García** - [rubegartor](https://github.com/rubegartor)

## License 📄

This project is under the License (MIT) - [LICENSE.MD](LICENSE.MD) for more details
