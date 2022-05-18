help:
  @echo "Usage: make [options] [target]"

pull_heroku_config:
  heroku config:pull -f .env.heroku --app nft-api-engine --overwrite --quiet

push_heroku_config:
  heroku config:push -f .env.heroku --app nft-api-engine --overwrite

git_push_heroku:
  git push heroku main
