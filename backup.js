var fs = require('fs')
  , logger = require('bunyan').createLogger({ name: 'github-backup', level: 'debug'})
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
  , properties = require('./properties')

function mkdir(dir, callback) {
  logger.debug('Creating ' + dir)
  fs.mkdir(dir, function (error) {
    if (!error || (error && error.code === 'EEXIST')) {
      logger.debug('Created ' + dir)
      callback()
    } else {
      logger.error(error)
      callback(error)
    }
  })
}

function setupDirectories(callback) {
  logger.info('Setting up directories')
  // Create directories for all the things
  var directories =
      [ 'gists'
      , 'repos'
      , 'wikis'
      ]

  async.each(directories, function (directory, callback) {
    mkdir(properties.destination + directory, callback)
  }, callback)
}

function backupRepos(org) {
  var childLogger = logger.child({ type: 'repos' })
  childLogger.info('Backing up repos for ' + org)
  github.repos.getFromOrg({ org: org }, function (error, repos) {
    if (error) throw error

    async.each(repos, function (repo, callback) {

      async.parallel([
        function (callback) {
          if (repo.has_wiki) {
            backupWiki(repo, callback)
          } else {
            return callback(error)
          }
        }
      , function (callback) {
          childLogger.info('Downloading ' + repo.full_name)
          var repoDestination = properties.destination + 'repos/' + repo.name + '.git'
            , command = 'git clone --mirror ' + repo.ssh_url + ' ' + repoDestination

          childLogger.debug('Executing command ' + command)
          cp.exec(command, function (error, stdout, stderr) {
            childLogger.debug('stdout ' + stdout)
            childLogger.debug('stderr ' + stderr)

            callback(error)
          })
        }
      ], function (error) {
        callback(error)
      })
    })
  })
}

function backupWiki(repo, callback) {
  var childLogger = logger.child({ type: 'wikis' })
  childLogger.info('Downloading ' + repo.full_name)

  var wikiDestination = properties.destination + 'wikis/' + repo.name + '.wiki.git'
    , command = 'git clone --mirror ' + repo.ssh_url.replace(/\.git$/, '.wiki.git') + ' ' + wikiDestination

  childLogger.debug('Executing command ' + command)
  cp.exec(command, function (error, stdout, stderr) {
    childLogger.debug('stdout ' + stdout)
    childLogger.debug('stderr ' + stderr)
    callback(error)
  })
}

function backupGists() {
  var childLogger = logger.child({ type: 'gists' })
  childLogger.info('Backing up gists')
  github.gists.getAll({}, function (error, gists) {
    if (error) throw error

    async.each(gists, function (gist, callback) {
      childLogger.info('Downloading ' + gist.description)

      var gistDir = properties.destination + 'gists/' + gist.id
      mkdir(gistDir, function (error) {
        if (error) return callback(error)

        async.each(Object.keys(gist.files), function (filename, callback) {
          var file = gist.files[filename]
          childLogger.info('File: Downloading ' + filename)
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

  logger.info('Authenticating')
  github.authenticate(
    { type: properties.authenticate.type
    , token: properties.authenticate.token
    }
  )

  setupDirectories(function (error) {
    if (error) throw error

    backupGists()

    properties.orgAccounts.forEach(function (org) {
      backupRepos(org.org)
    })
  })
}

backup()