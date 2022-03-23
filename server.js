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
      await filename.mv('./public/upload/' + filename.name)
      const ffmpeg = `2>&1 \\
      ffmpeg -i ${'./public/upload/' + filename.name} \\
      -af loudnorm=I=-16:dual_mono=true:TP=-1.5:LRA=11:print_format=summary \\
      -f null - | \\
      egrep '^Input|^Output|^Normalization|^Target'`
      exec(ffmpeg, (err, stdout, stderr) => {
        if (err) {
          console.log(err.message)
          return
        }
        const rawOutput = stdout.split('\n')
        const inputIntegrate    = rawOutput[ 2].split(':')[1].trim()
        const inputTruePeak     = rawOutput[ 3].split(':')[1].trim()
        const inputLRA          = rawOutput[ 4].split(':')[1].trim()
        const inputThreshold    = rawOutput[ 5].split(':')[1].trim()
        const outputIntegrated  = rawOutput[ 6].split(':')[1].trim()
        const outputTruePeak    = rawOutput[ 7].split(':')[1].trim()
        const outputLRA         = rawOutput[ 8].split(':')[1].trim()
        const outputThreshold   = rawOutput[ 9].split(':')[1].trim()
        const normalizationType = rawOutput[10].split(':')[1].trim()
        const targetOffset      = rawOutput[11].split(':')[1].trim()
        const result = {
          inputIntegrate, inputTruePeak, inputLRA, inputThreshold,
          outputIntegrated, outputTruePeak, outputLRA, outputThreshold,
          normalizationType, targetOffset
        }
        console.log(result)
        res.send({
          status: true,
          message: 'File is uploaded',
          data: {
            name: filename.name,
            mimetype: filename.mimetype,
            size: filename.size,
            result
          }
        })
      })
    }
  } catch (err) {
    res.status(500).send(err)
  }
}
