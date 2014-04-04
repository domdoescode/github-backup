var fs = require('fs')
  , async = require('async')
  , cp = require('child_process')
  , request = require('request')
  , GitHubApi = require('github')
  , github = new GitHubApi(
      { version: '3.0.0'
      , debug: false
      , protocol: 'https'
      , timeout: 5000
      }
    )
  , backupDir = __dirname + '/backup/'

github.authenticate(
  { type: 'oauth'
  , token: 'f398407b4af2a2c3abe30e0dae4c8d44b3cac4b2'
  }
)

function mkdir(dir, callback) {
  fs.mkdir(dir, function (error) {
    if (!error || (error && error.code === 'EEXIST')) {
      callback()
    } else {
      callback(error)
    }
  })
}

function setupDirectories(callback) {
  // Create directories for all the things
  var directories =
      [ 'gists'
      , 'repos'
      ]

  async.each(directories, function (directory, callback) {
    mkdir(backupDir + directory, callback)
  }, callback)
}

function backupRepos(org) {
  github.repos.getFromOrg({ org: org }, function (error, repos) {
    if (error) throw error

    async.each(repos, function (repo, callback) {
      var repoDestination = backupDir + 'repos/' + repo.name + '.git'
        , command = 'git clone --mirror ' + repo.ssh_url + ' ' + repoDestination

      cp.exec(command, function (error, stdout, stderr) {
        callback(error)
      })
    })
  })
}

function backupGists() {
  github.gists.getAll({}, function (error, gists) {
    if (error) throw error

    async.each(gists, function (gist, callback) {
      var gistDir = backupDir + 'gists/' + gist.id
      mkdir(gistDir, function (error) {
        if (error) return callback(error)

        async.each(Object.keys(gist.files), function (filename, callback) {
          var file = gist.files[filename]
          request(file.raw_url).pipe(fs.createWriteStream(gistDir + '/' + filename))
          callback()
        })
      })
    }, function (error) {
      if (error) throw error
    })
  })
}

function backup() {
  setupDirectories(function (error) {
    if (error) throw error

    // backupGists()
    backupRepos('synthmedia')
  })
}

backup()