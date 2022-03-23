const express = require('express')
const fileUpload = require('express-fileupload')
const bodyParser = require('body-parser')
const cors = require('cors')
const {exec} = require('child_process')
const app = express()
const port = 3333

app.use(express.static('public'))

app.use(fileUpload({
  createParentPath: true,
  limits: {
    fileSize: 500 * 1024 * 1024 * 1024 // 500MB max file size
  }})
)
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))
app.post('/upload', uploadHandler)

app.listen(port, () => {
  console.log('running on port', port)
})

async function uploadHandler(req, res) {
  try {
    if(!req.files) {
      res.send({
        status: false,
        message: 'No file uploaded'
      })
    } else {
      const filename = req.files.filename
      await filename.mv('./public/' + filename.name)
      const ffmpeg = `2>&1 ffmpeg -i ${'./public/'+filename.name} \\
      -af loudnorm=I=-16:dual_mono=true:TP=-1.5:LRA=11:print_format=summary \\
      -f null - | \\
      egrep '^Input|^Output|^Normalization|^Target'`
      exec(ffmpeg, (err, stdout, stderr) => {
        if (err) {
          console.log(err.message)
          return
        }
        let p = stdout.split('\n')
        const inputIntegrate    = p[2].split(':')[1].trim()
        const inputTruePeak     = p[3].split(':')[1].trim()
        const inputLRA          = p[4].split(':')[1].trim()
        const inputThreshold    = p[5].split(':')[1].trim()
        const outputIntegrated  = p[6].split(':')[1].trim()
        const outputTruePeak    = p[7].split(':')[1].trim()
        const outputLRA         = p[8].split(':')[1].trim()
        const outputThreshold   = p[9].split(':')[1].trim()
        const normalizationType = p[10].split(':')[1].trim()
        const targetOffset      = p[11].split(':')[1].trim()
        res.send({
          status: true,
          message: 'File is uploaded',
          data: {
            name: filename.name,
            mimetype: filename.mimetype,
            size: filename.size,
            result: {
              inputIntegrate, inputTruePeak, inputLRA, inputThreshold,
              outputIntegrated, outputTruePeak, outputLRA, outputThreshold,
              normalizationType, targetOffset
            }
          }
        })
        // console.log(`stdout: ${p}`, '---------------')
        // console.log('inputIntegrate', inputIntegrate)
        // console.log('inputTruePeak', inputTruePeak)
        // console.log('inputLRA', inputLRA)
        // console.log('inputThreshold', inputThreshold)
        // console.log('outputIntegrated', outputIntegrated)
        // console.log('outputTruePeak', outputTruePeak)
        // console.log('outputLRA', outputLRA)
        // console.log('outputThreshold', outputThreshold)
      })
    }
  } catch (err) {
    res.status(500).send(err)
  }
  console.log(req.body)
}
