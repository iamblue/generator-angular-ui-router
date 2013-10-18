'use strict';

<% if(uirouterModules){ %>
  angular.module('<%= _.camelize(appname) %>App', [<%= angularModules %>])
  .config(function ($stateProvider, $urlRouterProvider) {
    //delete $httpProvider.defaults.headers.common['X-Requested-With'];
    $urlRouterProvider.otherwise('/');
    $stateProvider
      .state('index', {
        url: '/',
        templateUrl: 'views/main.html',
        controller:'MainCtrl'
      })
  })
<% }else{ %>
  angular.module('<%= _.camelize(appname) %>App', [<%= angularModules %>])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/main.html',
        controller: 'MainCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  });
<% } %>



