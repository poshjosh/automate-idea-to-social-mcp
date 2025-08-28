```dotenv
APP_VERSION=0.0.1
TASK_CACHE_TTL_SECONDS=86400

# USER_HOME is only required when running in a docker container
# From within our docker container, we run the aideas docker container.
# To run the aideas docker container we mount ${USER_HOME}/.aideas to /root/.aideas
# We could use the system's ${HOME} variable from within our container,
# but that would only point to the containers home directory (e.g /root).
#USER_HOME=/Users/chinomso

# Either use an external environment file like this
#AIDEAS_ENV_FILE=/Users/chinomso/.aideas/content/run.env

# Or specify the required environment variables in this file, prefixed with 'AIDEAS_'.
AIDEAS_APP_VERSION=0.3.4

########################################################################################
# aideas related environment variables
# Environment which should be passed to aideas should be prefixed with this;
# Except when those env variables are defined in a separate AIDEAS_ENV_FILE.
########################################################################################

# Add variables based on the agents you intend to use.
# For example, add the following for twitter.
# For the full list of environment variables, 
# see: https://github.com/poshjosh/automate-idea-to-social/blob/main/docs/environment.md
AIDEAS_TWITTER_USER_EMAIL=
AIDEAS_TWITTER_USER_NAME=
AIDEAS_TWITTER_USER_PASS=
```