'use strict';

module.exports = function (PortCall) {

  PortCall.getRoutes = function (etd, eta, it, cb) {
    // For more information on how to query data in loopback please see
    // https://docs.strongloop.com/display/public/LB/Querying+data
    const query = {
      where: {
        and: [
          { // port call etd >= etd param, or can be null
            or: [{ etd: { gte: etd } }, { etd: null }]
          },
          { // port call eta <= eta param, or can be null
            or: [{ eta: { lte: eta } }, { eta: null }]
          }
        ]
      },
      order: 'etd ASC'
    };

    PortCall.find(query)
      .then(calls => {
        // TODO: convert port calls to voyages/routes
        return cb(null, getVoyages(calls, it));
      })
      .catch(err => {
        console.log(err);

        return cb(err);
      });
  };

  PortCall.remoteMethod('getRoutes', {
    accepts: [
      { arg: 'etd', 'type': 'date' },
      { arg: 'eta', 'type': 'date' },
      { arg: 'it', 'type': 'boolean' }
    ],
    returns: [
      { arg: 'routes', type: 'array', root: true }
    ]
  });

};

function getVoyages(ports, includeTrans) {
  let routes = {};
  let voyages = [];
  let transhipmentVoyages = [];

  for (let i = 0; i < ports.length; i++) {
    let prop = ports[i].routeId;
    let port = ports[i];

    if (!routes.hasOwnProperty(prop)) {
      routes[prop] = [];
    }

    // Start - Group the voyages by Route

    if (routes[prop].length > 0) {
      routes[prop][routes[prop].length - 1].portTo = port.port;
      routes[prop][routes[prop].length - 1].vesselTo = port.vessel;
      routes[prop][routes[prop].length - 1].etdTo = port.etd;
      routes[prop][routes[prop].length - 1].etaTo = port.eta;
    }

    routes[prop].push({
      'routeId': prop,
      'portFrom': port.port,
      'vesselFrom': port.vessel,
      'etdFrom': port.etd,
      'etaFrom': port.eta,
      'portTo': null,
      'vesselTo': null,
      'etdTo': null,
      'etaTo': null
    });

    // End - Group the voyages by Route

    // Start - Collecting the transhipments options
    if (includeTrans) {
      let transPorts = '';
      let transVessels = '';
      let currentRoute = prop;
      let currentPort = port.port;
      let currentEta = port.eta;
      let routeCount = 1;
      let hasTranshipment = false;
      let hasOtherRoute = false;
      let routeInstances = 0;
      
      transPorts = 'Route ' + routeCount + ': ' + currentPort;
      transVessels = port.vessel ;

      // Start - Check each voyage if has transhipment option
      for (let j = (i + 1); j < ports.length; j++) {
        
        if (currentRoute == ports[j].routeId ) {
          routeInstances = routeInstances + 1;
          if (hasOtherRoute) {
            hasTranshipment = true;
            if (hasOtherRoute) {
              routeCount = routeCount + 1;
              transPorts = transPorts + ' Route ' + routeCount + ': ' + currentPort;
              transVessels = transVessels + ' -> ' + ports[j].vessel;
            }
          }

          currentPort = ports[j].port;
          transPorts = transPorts + ' -> ' + currentPort;
          hasOtherRoute = false;
          
        } else {
          if (ports[j].port == currentPort && currentEta < ports[j].etd && routeInstances >= 1 ) {
            hasOtherRoute = true;
            currentRoute = ports[j].routeId;
            routeInstances = 0;
          }
        }
      }
      // End - Check each voyage if has transhipment option

      // Start - Push the transhipment option to Array for display.
      if (hasTranshipment) {
        transhipmentVoyages.push({
          transhipment: true,
          routes: transPorts,
          vessels: transVessels
        }); 
      }
      // End - Push the transhipment option to Array for display.

    }
    // End - Collecting the transhipments options

  }

  for (var key in routes) {
    voyages = voyages.concat(routes[key]);
  }

  // Start - Add the transhipment options to the display.
  if (includeTrans) {
    voyages = voyages.concat(transhipmentVoyages);
  }
  // Start - Add the transhipment options to the display.

  return voyages;
}