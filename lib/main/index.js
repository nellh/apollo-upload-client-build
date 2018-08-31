'use strict'

exports.__esModule = true
exports.createUploadLink = exports.ReactNativeFile = void 0

var _apolloLink = require('apollo-link')

var _apolloLinkHttpCommon = require('apollo-link-http-common')

var _extractStreamsFiles = require('./extract-streams-files')

var _extractFiles = require('extract-files')

exports.ReactNativeFile = _extractFiles.ReactNativeFile

const createUploadLink = ({
  uri: fetchUri = '/graphql',
  fetch: linkFetch = fetch,
  fetchOptions,
  credentials,
  headers,
  includeExtensions,
  serverFormData
} = {}) => {
  const linkConfig = {
    http: {
      includeExtensions
    },
    options: fetchOptions,
    credentials,
    headers
  }
  return new _apolloLink.ApolloLink(operation => {
    const uri = (0, _apolloLinkHttpCommon.selectURI)(operation, fetchUri)
    const context = operation.getContext()
    const contextConfig = {
      http: context.http,
      options: context.fetchOptions,
      credentials: context.credentials,
      headers: context.headers
    }
    const { options, body } = (0,
    _apolloLinkHttpCommon.selectHttpOptionsAndBody)(
      operation,
      _apolloLinkHttpCommon.fallbackHttpConfig,
      linkConfig,
      contextConfig
    )
    const files = (0, _extractStreamsFiles.extractFilesOrStreams)(body)
    const payload = (0, _apolloLinkHttpCommon.serializeFetchParameter)(
      body,
      'Payload'
    )
    const promises = []

    if (files.length) {
      delete options.headers['content-type']
      if (_extractStreamsFiles.isBrowserOrNative) options.body = new FormData()
      else if (serverFormData) options.body = new serverFormData()
      else
        throw new _extractStreamsFiles.NoFormDataException(`FormData function doesn't exist on this server version. \
We suggest you installing 'form-data' via npm and pass it as \
as an argument in 'createUploadLink' function : '{ serverFormData: FormData }'`)
      options.body.append('operations', payload)
      options.body.append(
        'map',
        JSON.stringify(
          files.reduce((map, { path }, index) => {
            map[`${index}`] = [path]
            return map
          }, {})
        )
      )
      files.forEach(({ file }, index) => {
        if ((0, _extractStreamsFiles.isStream)(file))
          options.body.append(index, file)
        else if (file instanceof Promise)
          promises.push(
            new Promise((resolve, reject) => {
              file
                .then(file => {
                  const { filename, mimetype: contentType } = file
                  const bufs = []
                  file.stream.on('data', function(buf) {
                    bufs.push(buf)
                  })
                  file.stream.on('end', function() {
                    const buffer = Buffer.concat(bufs)
                    const knownLength = buffer.byteLength
                    options.body.append(index, buffer, {
                      filename: filename,
                      contentType,
                      knownLength
                    })
                    resolve()
                  })
                  file.stream.on('error', reject)
                })
                .catch(reject)
            })
          )
        else options.body.append(index, file, file.name)
      })
    } else options.body = payload

    return new _apolloLink.Observable(observer => {
      const { controller, signal } = (0,
      _apolloLinkHttpCommon.createSignalIfSupported)()
      if (controller) options.signal = signal
      Promise.all(promises)
        .then(() => {
          linkFetch(uri, options)
            .then(response => {
              operation.setContext({
                response
              })
              return response
            })
            .then(
              (0, _apolloLinkHttpCommon.parseAndCheckHttpResponse)(operation)
            )
            .then(result => {
              observer.next(result)
              observer.complete()
            })
            .catch(error => {
              if (error.name === 'AbortError') return
              if (error.result && error.result.errors && error.result.data)
                observer.next(error.result)
              observer.error(error)
            })
        })
        .catch(e => {
          throw {
            message: 'Error while draining stream.',
            error: e
          }
        })
      return () => {
        if (controller) controller.abort()
      }
    })
  })
}

exports.createUploadLink = createUploadLink
