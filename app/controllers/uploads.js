'use strict';

const controller = require('lib/wiring/controller');
const models = require('app/models');
const Upload = models.upload;

const superagent = require('superagent');

// const authenticate = require('./concerns/authenticate');
const middleware = require('app/middleware');
const multer = middleware.multer;
const awsS3Upload = require('lib/aws-s3-upload');
const mime = require('mime-types');

const index = (req, res, next) => {
  Upload.find()
    .then(uploads => res.json({ uploads }))
    .catch(err => next(err));
};

// const show = (req, res, next) => {
//   Upload.findById(req.params.id)
//     .then(upload => upload ? res.json({ upload }) : next())
//     .catch(err => next(err));
// };

const create = (req, res, next) => {
  let upload = {
    mime: req.file.mimetype,
    data: req.file.buffer,
    ext: mime.extension(req.file.mimetype)
  };

  awsS3Upload(upload)
  .then((s3response) => {
    console.log(`"${req.body.upload.title}" uploaded successfully.`);
    console.log(s3response);
    let postData = JSON.stringify({
      "url": s3response.Location
    });

    superagent
      .post('https://api.projectoxford.ai/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=true')
      .set('Content-Type', 'application/json')
      .set('Ocp-Apim-Subscription-Key', 'd487f4fe54ca4889b5dbbd8bbb72b596')
      .send(postData)
      .end( function(err, res) {
        if(err){
          console.log(err);
        }
        console.log(res);
        let upload = {
          location: s3response.Location,
          title: req.body.upload.title,
          photo_api_data: res.body,
        };
       return Upload.create(upload);
      });

  })
  .then((data) => {
    res.status(201).json({ data });
  })
  .catch(err => next(err));

};

// const update = (req, res, next) => {
//   let search = { _id: req.params.id, _owner: req.currentUser._id };
//   Upload.findOne(search)
//     .then(upload => {
//       if (!upload) {
//         return next();
//       }
//
//       delete req.body._owner;  // disallow owner reassignment.
//       return upload.update(req.body.upload)
//         .then(() => res.sendStatus(200));
//     })
//     .catch(err => next(err));
// };
//
// const destroy = (req, res, next) => {
//   let search = { _id: req.params.id, _owner: req.currentUser._id };
//   Upload.findOne(search)
//     .then(upload => {
//       if (!upload) {
//         return next();
//       }
//
//       return upload.remove()
//         .then(() => res.sendStatus(200));
//     })
//     .catch(err => next(err));
// };

module.exports = controller({
  index,
  // show,
  create,
  // update,
  // destroy,
}, { before: [ // Array of middleware actions
  // { method: authenticate, only: ['create'] },
  // { method: multer.single('upload[file]'), only: ['create'] },
  { method: multer.single('upload[file]'), only: ['create']},
], });
