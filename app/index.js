'use strict';
var path = require('path');
var util = require('util');
var spawn = require('child_process').spawn;
var yeoman = require('yeoman-generator');


var Generator = module.exports = function Generator(args, options) {
  yeoman.generators.Base.apply(this, arguments);
  this.argument('appname', { type: String, required: false });
  this.appname = this.appname || path.basename(process.cwd());

  args = ['main'];

  if (typeof this.env.options.appPath === 'undefined') {
    try {
      this.env.options.appPath = require(path.join(process.cwd(), 'bower.json')).appPath;
    } catch (e) {}
    this.env.options.appPath = this.env.options.appPath || 'app';
  }

  this.appPath = this.env.options.appPath;

  if (typeof this.env.options.coffee === 'undefined') {
    this.option('coffee');

    // attempt to detect if user is using CS or not
    // if cml arg provided, use that; else look for the existence of cs
    if (!this.options.coffee &&
      this.expandFiles(path.join(this.appPath, '/scripts/**/*.coffee'), {}).length > 0) {
      this.options.coffee = true;
    }

    this.env.options.coffee = this.options.coffee;
  }

  if (typeof this.env.options.minsafe === 'undefined') {
    this.option('minsafe');
    this.env.options.minsafe = this.options.minsafe;
    args.push('--minsafe');
  }

  this.hookFor('angular-ui-router:common', {
    args: args
  });

  this.hookFor('angular-ui-router:main', {
    args: args
  });

  this.hookFor('angular-ui-router:controller', {
    args: args
  });

  this.hookFor('karma', {
    as: 'app',
    options: {
      options: {
        coffee: this.options.coffee,
        travis: true,
        'skip-install': this.options['skip-install']
       }
    }
  });

  this.on('end', function () {
    this.installDependencies({ skipInstall: this.options['skip-install'] });
  });

  this.pkg = JSON.parse(this.readFileAsString(path.join(__dirname, '../package.json')));
};

util.inherits(Generator, yeoman.generators.Base);

Generator.prototype.askForSass = function askForSass() {
  var cb = this.async();

  this.prompt([{
    type: 'confirm',
    name: 'usingSass',
    message: 'Would you like to use Sass with the Compass CSS Authoring Framework?',
    default: true
  }, {
    type: 'list',
    name: 'syntax',
    message: 'Which syntax do you prefer?',
    choices: ['sass', 'scss'],
    when: function (props) {
      return props.usingSass;
    }
  }], function (props) {
    var syntax = props.syntax;

    this.usingSass = props.usingSass;

    if (syntax === 'sass') {
      this.sass = true;
    } else if (syntax === 'scss') {
      this.scss = true;
    }

    cb();
  }.bind(this));
};

Generator.prototype.askForBootstrap = function askForBootstrap() {
  var cb = this.async();

  this.prompt([{
    type: 'confirm',
    name: 'bootstrap',
    message: 'Would you like to include Twitter Bootstrap?',
    default: true
  },{
    type: 'confirm',
    name: 'compassBootstrap',
    message: 'Would you like to use the SCSS version of Twitter Bootstrap with the Compass CSS Authoring Framework?',
    default: true,
    when: function (props) {
      return props.bootstrap;
    }
  }], function (props) {
    this.bootstrap = props.bootstrap;
    this.compassBootstrap = props.compassBootstrap;

    cb();
  }.bind(this));
};

Generator.prototype.askForModules = function askForModules() {
  var cb = this.async();

  var prompts = [{
    type: 'checkbox',
    name: 'modules',
    message: 'Which modules would you like to include?',
    choices: [{
      value: 'resourceModule',
      name: 'angular-resource.js',
      checked: true
    }, {
      value: 'cookiesModule',
      name: 'angular-cookies.js',
      checked: true
    }, {
      value: 'sanitizeModule',
      name: 'angular-sanitize.js',
      checked: true
    }, {
      value: 'uirouterModule',
      name: 'angular-ui-router.js',
      checked: true
    }]
  }];

  this.prompt(prompts, function (props) {
    var hasMod = function (mod) { return props.modules.indexOf(mod) !== -1; };
    this.resourceModule = hasMod('resourceModule');
    this.cookiesModule = hasMod('cookiesModule');
    this.sanitizeModule = hasMod('sanitizeModule');
    this.uirouterModule = hasMod('uirouterModule');

    var angMods = [];

    if (this.cookiesModule) {
      angMods.push("'ngCookies'");
    }

    if (this.resourceModule) {
      angMods.push("'ngResource'");
    }
    if (this.sanitizeModule) {
      angMods.push("'ngSanitize'");
    }
    if (this.uirouterModule) {
      angMods.push("'ui.router'");
    }

    if (angMods.length) {
      this.env.options.uirouterModules = this.uirouterModule;
      this.env.options.angularDeps = "\n  " + angMods.join(",\n  ") +"\n";
    }

    cb();
  }.bind(this));
};

Generator.prototype.readIndex = function readIndex() {
  this.indexFile = this.engine(this.read('../../templates/common/index.html'), this);
};

Generator.prototype.useSass = function useSass() {
  var sass = this.sass;
  var scss = this.scss;
  var prefix;

  if (this.usingSass && !this.compassBootstrap) {
    prefix = sass ? 'sa' : 'sc';
    this.copy('styles/sass/main.' + prefix + 'ss', 'app/styles/main.' + prefix + 'ss');
  }
};

// Waiting a more flexible solution for #138
// Added an ugly if-else statemnt to exclude copying main.css when user use sass.
Generator.prototype.bootstrapFiles = function bootstrapFiles() {
  var sass = this.compassBootstrap;
  var files = [];
  var source = 'styles/' + ( sass ? 's' : '' ) + 'css/';

  if (this.bootstrap) {
    if (!sass) {
      files.push('bootstrap.css');
    }

    this.copy('images/glyphicons-halflings.png', 'app/images/glyphicons-halflings.png');
    this.copy('images/glyphicons-halflings-white.png', 'app/images/glyphicons-halflings-white.png');
  }

  files.push('main.' + (sass ? 's' : '') + 'css');

  files.forEach(function (file) {
    if (file !== 'main.css') {
      this.copy(source + file, 'app/styles/' + file);
    } else if (!this.sass && !this.scss) {
      this.copy(source + file, 'app/styles/' + file);
    }
  }.bind(this));

  this.indexFile = this.appendFiles({
    html: this.indexFile,
    fileType: 'css',
    optimizedPath: 'styles/main.css',
    sourceFileList: files.map(function (file) {
      return 'styles/' + file.replace('.scss', '.css');
    }),
    searchPath: '.tmp'
  });
};

Generator.prototype.bootstrapJS = function bootstrapJS() {
  if (!this.bootstrap) {
    return;  // Skip if disabled.
  }

  // Wire Twitter Bootstrap plugins
  this.indexFile = this.appendScripts(this.indexFile, 'scripts/plugins.js', [
    'bower_components/bootstrap-sass/js/bootstrap-affix.js',
    'bower_components/bootstrap-sass/js/bootstrap-alert.js',
    'bower_components/bootstrap-sass/js/bootstrap-dropdown.js',
    'bower_components/bootstrap-sass/js/bootstrap-tooltip.js',
    'bower_components/bootstrap-sass/js/bootstrap-modal.js',
    'bower_components/bootstrap-sass/js/bootstrap-transition.js',
    'bower_components/bootstrap-sass/js/bootstrap-button.js',
    'bower_components/bootstrap-sass/js/bootstrap-popover.js',
    'bower_components/bootstrap-sass/js/bootstrap-typeahead.js',
    'bower_components/bootstrap-sass/js/bootstrap-carousel.js',
    'bower_components/bootstrap-sass/js/bootstrap-scrollspy.js',
    'bower_components/bootstrap-sass/js/bootstrap-collapse.js',
    'bower_components/bootstrap-sass/js/bootstrap-tab.js'
  ]);
};

Generator.prototype.extraModules = function extraModules() {
  var modules = [];
  if (this.resourceModule) {
    modules.push('bower_components/angular-resource/angular-resource.js');
  }

  if (this.cookiesModule) {
    modules.push('bower_components/angular-cookies/angular-cookies.js');
  }

  if (this.sanitizeModule) {
    modules.push('bower_components/angular-sanitize/angular-sanitize.js');
  }

  if (this.uirouterModule) {
    modules.push('bower_components/angular-ui-router/release/angular-ui-router.js');
  }

  if (modules.length) {
    this.indexFile = this.appendScripts(this.indexFile, 'scripts/modules.js',
        modules);
  }
};

Generator.prototype.appJs = function appJs() {
  this.indexFile = this.appendFiles({
    html: this.indexFile,
    fileType: 'js',
    optimizedPath: 'scripts/scripts.js',
    sourceFileList: ['scripts/app.js', 'scripts/controllers/main.js'],
    searchPath: ['.tmp', 'app']
  });
};

Generator.prototype.createIndexHtml = function createIndexHtml() {
  this.write(path.join(this.appPath, 'index.html'), this.indexFile);
};

Generator.prototype.packageFiles = function () {
  this.template('../../templates/common/_bower.json', 'bower.json');
  this.template('../../templates/common/_package.json', 'package.json');
  this.template('../../templates/common/Gruntfile.js', 'Gruntfile.js');
};
