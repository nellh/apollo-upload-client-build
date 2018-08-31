'use strict'

exports.__esModule = true
exports.NoFormDataException = NoFormDataException
exports.extractFilesOrStreams = exports.isStream = exports.isBrowserOrNative = void 0

var _extractFiles = require('extract-files')

const isObject = value => typeof value === 'object' && value !== null

function NoFormDataException(message) {
  this.message = message
  this.name = 'NoFormDataException'
}

const isBrowserOrNative = (function() {
  try {
    if (FormData) return true
  } catch (e) {
    return false
  }
})()

exports.isBrowserOrNative = isBrowserOrNative

const isStream = obj => {
  return (
    obj &&
    typeof obj.pipe === 'function' &&
    typeof obj._read === 'function' &&
    typeof obj._readableState === 'object' &&
    obj.readable !== false
  )
}

exports.isStream = isStream

const extractFilesOrStreams = (tree, treePath) => {
  if (isBrowserOrNative) return (0, _extractFiles.extractFiles)(tree)
  else {
    if (treePath === void 0) treePath = ''
    var files = []

    var recurse = function recurse(node, nodePath) {
      Object.keys(node).forEach(function(key) {
        if (!isObject(node[key])) return
        var path = '' + nodePath + key

        if (isStream(node[key]) || node[key] instanceof Promise) {
          files.push({
            path: path,
            file: node[key]
          })
          node[key] = null
          return
        } else if (node[key].length) node[key] = Array.prototype.slice.call(node[key])

        recurse(node[key], path + '.')
      })
    }

    if (isObject(tree))
      recurse(tree, treePath === '' ? treePath : treePath + '.')
    return files
  }
}

exports.extractFilesOrStreams = extractFilesOrStreams
