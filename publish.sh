# Build TS
cd ./tasks/apptest.ai
npm install
tsc 
cd ../../

# Create extension
tfx extension create --manifest-globs vss-extension.json
