# github-backup

Just a small node project to be able to backup all of the content that has been
uploaded to Github on either personal or business accounts.

## Getting Started

`npm install`

Copy the `properties.sample.js` file to `properties.js` and fill in your user,
org, and auth details.

`node backup`

Done!

## Issues

Currently you can only backup gists for a single user; the one that is
authenticated. This will be changed in future, however only public gists will be
backed up unless an authentication token is provided.