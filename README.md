# now uses yarn and gulp
if you dont have yarn, install it

# 1. install dependencies
yarn
npm i

# 2. install gulp
yarn add global gulp-cli
or npm i gulp-cli -g

# 3. watch and serve
gulp watch
but i recommend to run only gulp first to build everything, because it is serving from dist 

# or only build
gulp

# any problems?
try to remove node_nodules, yarn.lock and package-lock.json if exists and run 'yarn install' again