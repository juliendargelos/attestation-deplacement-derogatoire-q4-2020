const { promises: fs } = require('fs')
const { PDFDocument, StandardFonts } = require('pdf-lib')
const QRCode = require('qrcode')

module.exports.handler = async ({ queryStringParameters: {
  firstname = '',
  lastname = '',
  birthday = '',
  birthtown = '',
  address = '',
  city = '',
  zipcode = '',
  date = '',
  reasons = ''
} }) => {
  date = new Date(date)

  return {
    status: 200,
    isBase64Encoded: true,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="attestation-${
        formatDateAlternate(date, '-')
      }-${
        formatTime(date, '-')
      }.pdf"`
    },
    body: (await generatePdf({
      firstname,
      lastname,
      birthday,
      birthtown,
      address,
      city,
      zipcode,
      date,
      reasons
    })).toString('base64')
  }
}

const ys = {
  travail: 578,
  achats: 533,
  sante: 477,
  famille: 435,
  handicap: 396,
  sport_animaux: 358,
  convocation: 295,
  missions: 255,
  enfants: 211
}

async function generatePdf(parameters) {
  const {
    lastname,
    firstname,
    birthtown,
    address,
    zipcode,
    city,
    reasons
  } = parameters

  const date = new Date(parameters.date)
  const birthday = new Date(parameters.birthday)

  const existingPdfBytes = await fs.readFile(`${__dirname}/../public/certificate.pdf`)
  const pdfDoc = await PDFDocument.load(existingPdfBytes)
  const qrCode = await pdfDoc.embedPng(await QRCode.toDataURL([
    `Cree le: ${formatDateAlternate(date, '-')} a ${formatTime(date)}`,
    `Nom: ${lastname}`,
    `Prenom: ${firstname}`,
    `Naissance: ${formatDate(birthday)} a ${birthtown}`,
    `Adresse: ${address} ${zipcode} ${city}`,
    `Sortie: ${formatDate(date)} a ${formatTime(date)}`,
    `Motifs: ${reasons}`
  ].join(';\n '), {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    quality: 0.92,
    margin: 1
  }))

  pdfDoc.setTitle('COVID-19 - Déclaration de déplacement')
  pdfDoc.setSubject('Attestation de déplacement dérogatoire')
  pdfDoc.setKeywords([
    'covid19',
    'covid-19',
    'attestation',
    'déclaration',
    'déplacement',
    'officielle',
    'gouvernement'
  ])
  pdfDoc.setProducer('DNUM/SDIT')
  pdfDoc.setCreator('')
  pdfDoc.setAuthor("Ministère de l'intérieur")
  pdfDoc.addPage()

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const [page1, page2] = pdfDoc.getPages()
  const drawText = (text, x, y, size = 11) => {
    page1.drawText(text, { x, y, size, font })
  }

  drawText(`${firstname} ${lastname}`, 119, 696)
  drawText(formatDate(birthday), 119, 674)
  drawText(birthtown, 297, 674)
  drawText(`${address} ${zipcode} ${city}`, 133, 652)

  reasons.split(',').forEach((reason) => {
    reason = reason.trim()
    reasons in ys && drawText('x', 84, ys[reason], 18)
  })

  drawText(city, 105, 177, getIdealFontSize(font, city, 83, 7, 11) || 7)
  drawText(`${formatDate(date)}`, 91, 153, 11)
  drawText(`${formatTime(date)}`, 264, 153, 11)

  page1.drawImage(qrCode, {
    x: page1.getWidth() - 156,
    y: 100,
    width: 92,
    height: 92,
  })

  page2.drawImage(qrCode, {
    x: 50,
    y: page2.getHeight() - 350,
    width: 300,
    height: 300,
  })

  return new Buffer.from(await pdfDoc.save())
}

function getIdealFontSize(font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize
  let textWidth = font.widthOfTextAtSize(text, defaultSize)

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize)
  }

  return textWidth > maxWidth ? null : currentSize
}

function formatDate(date, separator = '/') {
  return `${
    `${date.getDate()}`.padStart(2, '0')
  }${separator}${
    `${date.getMonth() + 1}`.padStart(2, '0')
  }${separator}${
    date.getFullYear()
  }`
}

function formatTime(date, separator = ':') {
  return `${
    `${date.getHours()}`.padStart(2, '0')
  }${separator}${
    `${date.getMinutes()}`.padStart(2, '0')
  }`
}

function formatDateAlternate(date, separator = '/') {
  return `${
    date.getFullYear()
  }${separator}${
    `${date.getDate()}`.padStart(2, '0')
  }${separator}${
    `${date.getMonth() + 1}`.padStart(2, '0')
  }`
}
