# Tectonic Installer

Wiz is a tool that helps install Tectonic. It may become more or less. It may be subsumed by some other project. But today, The Wiz lives here.

Wiz dynamically generates a series of forms to collect user information.
The entire app is organized into the following structure:

- app (bootstrap and manifest init)
  - form-step (all forms): renders back/next buttons, disables buttons, handles form submits, navigates to next/previous step.
    - dynamic-form (form): renders an angular/html form dynamically, setups up the ngForm, iterates thru and displays all fields, configures validators, delegates formModel to fields.
      - dynamic-field (fields): collects input, renders field, handles own validation or any custom logic for complex fields.

Wiz uses Angular2 for it's superior dynamic form-building capabilities.

## Development Dependencies

See the [global project README](../README.md) for tool requirements and versions.

The ./build script requires the directory containing this file to be
on your $GOPATH - you can ensure this by git cloning this repo in a
strategic location, or by running
```
ln -s `pwd` $GOPATH/src/github.com/coreos-inc/tectonic
```

You'll also need npm install angular2 and its associated tools. You
can do this with:
```
cd web
npm install
```

## Dependency Management

Go dependencies are managed with Glide, to install:
```
go get github.com/Masterminds/glide
```

The `vendor/` directory contains all dependencies and is generated by glide, do not edit it by hand.

### Adding a New Dependency:

- Edit the `glide.yaml` file to add your dependency.
- Ensure you add a `version` field for the sha or tag you want to pin to.
- Run the following command to install your newly added package (all three of `--update-vendored`, `--strip-vendor` and `--strip-vcs` are required, or you'll break our build/source control in wacky ways):
```
glide update --update-vendored --strip-vendor --strip-vcs
```

If it worked correctly it should:
- Clone your new dep to the `/vendor` dir, and check out the ref you specified.
- Update `glide.lock` to include your new package, adds any transitive dependencies, and updates its hash.

For the sake of your fellow reviewers, commit vendored code changes as a separate commit from any other changes.

### Regenerate or Repair Vendored Code

Should you need to regenerate or repair the vendored code en-mass from their source repositories, you can run:
```
rm -rf vendor/
glide install --strip-vendor --strip-vcs
```

## Building

Build both the frontend and backend sources:
```
./build
```

Build only the frontend:
```
cd web && npm run build
```

Run the frontned tests:
```
cd web && npm test
```

## Running in Dev mode

Run two processes for file watch-and-auto-reload.

Run the server and reload index templates:
```
./bin/wiz start --reload-templates
```

Build the frontend and watch for typescript file changes.
```
cd web && npm run build:w
```