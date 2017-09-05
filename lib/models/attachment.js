'use strict';

const mongoose = require('mongoose');
const S3 = require('aws-sdk/clients/s3');
const uuid = require('uuid/v4');
const path = require('path');

const hooks = require('../plugins/hooks');
const UserSchema = require('./user');

module.exports = settings => {

  const Attachment = new mongoose.Schema({
    name: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true
    },
    key: {
      type: String,
      required: true
    },
    createdBy: {
      type: UserSchema(settings),
      required: true
    },
    case: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true
    }
  }, { timestamps: true });

  const getS3 = () => new S3({
    credentials: {
      accessKeyId: settings.s3.key,
      secretAccessKey: settings.s3.secret
    },
    region: settings.s3.region
  });

  Attachment.plugin(hooks, { hooks: settings.hooks, event: 'attachment' });

  Attachment.statics.getAttachment = function(id) {
    const s3 = getS3();
    return AttachmentModel.findOne({ _id: id })
      .then(model => {
        return s3.getSignedUrl('getObject', { Bucket: settings.s3.bucket, Key: model.key, Expires: 60 });
      })
      .then(url => ({ url }));
  }

  Attachment.statics.createAttachments = function(data, user) {
    const files = data.attachments || [];

    return files.reduce((promise, file) => {
      return promise.then(results => {
        return AttachmentModel.createAttachment(Object.assign({ case: data.case }, file), user)
          .then(result => {
            return results.concat(result);
          });
      });
    }, Promise.resolve([]))
    .then(results => {
      if (data.comment) {
        return mongoose.model('Comment').createComment({
          comment: data.comment,
          case: data.case,
          attachments: results.map(file => file._id)
        }, user)
        .then(() => results);
      }
      return results;
    });
  }

  Attachment.statics.createAttachment = function(data, user) {
    const s3 = getS3();
    const name = data.name;
    const key = `${uuid()}${path.extname(name)}`;
    const regex = /^data:.+\/(.+);base64,(.*)$/;

    const matches = data.data.match(regex);
    const filedata = matches[2];
    const params = {
      Bucket: settings.s3.bucket,
      Key: key,
      Body: Buffer.from(filedata, 'base64'),
      ACL: 'bucket-owner-read',
      ContentType: data.mimetype
    };
    return new Promise((resolve, reject) => {
      s3.putObject(params, (err, response) => {
        err ? reject(err) : resolve(response);
      })
    })
    .then(response => {
      return AttachmentModel.create({
        name,
        mimetype: data.mimetype,
        key,
        createdBy: user,
        case: data.case
      });
    });
  }

  const AttachmentModel = mongoose.model('Attachment', Attachment);

}