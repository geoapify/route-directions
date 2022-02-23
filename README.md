# Route Directions component

Route Directions is an integration component that lets you add a User Interface for [Geoapify Routing API](https://www.geoapify.com/routing-api/) functionality to your website. RouteWaypoints lets you easily define route waypoints, select and save routes, choose your routing mode (car, bicycle, motorbike), and set your preferred route options (avoid highways, tolls, ferries).

## [Live Demo](https://geoapify.github.io/route-directions/index.html)

## Add Route Directions to your website

The Route Directions component is flexible and straightforward to use. Here's how to get started with it.

### Step 0. Get a Geoapify API key
The component uses [Geoapify Geocoding API](https://www.geoapify.com/geocoding-api/) and [Routing API](https://www.geoapify.com/routing-api/) to get waypoints and calculate routes. You need to register for a Geoapify API key first - [Sign Up](https://www.geoapify.com/get-started-with-maps-api/).

Geoapify offers a Free plan that includes up to 3,000 API requests per day. You can upgrade to a paid plan that better fits your needs at any time.

### Step 1. Install or link Route Directions package
#### Option 1
The Driving Directions component is available as a package in NPM. You can install it with the npm command to your project:
```
npm i @geoapify/route-directions
```
Then import the styles file. For example, in your styles file, add:

```css
@import '~@geoapify/route-directions/styles/styles.css';
```

#### Option 2
As an alternative, you can add a library link to your HTML page:

```html
<script src="https://unpkg.com/@geoapify/route-directions@^1/dist/index.js"></script>
```

This can be especially useful when you use a CMS (WordPress, Hubspot, Joomla, etc.) to build your website.
Then, add the component styling as an appropriate HTML tag, like so:

```html
<link rel="stylesheet" href="https://unpkg.com/@geoapify/route-directions@^1/styles/styles.css" />
```

### Step 2. Add HTML-container

The Routing component needs to be put inside an HTML container in which all the controls will be placed. This can be a simple div element with some unique id, so you can access it from a document object:

```html
<div id="route-directions"></div>
```

The control will take up the entire width of the container.

### Step 3. Add Route Directions to the provided container

Then you would create a RouteDirections object like this:

```js
const routeDirections = new RouteDirections(document.getElementById("route-directions"), GEOAPIFY_API_KEY);
```

or like this, if you want to pass custom options object:

```js
const routeDirectionOptions = {
  ...
};

const geocoderOptions = {
  ...
};

const routeDirections = new RouteDirections(document.getElementById("route-directions"), GEOAPIFY_API_KEY, routeDirectionOptions, geocoderOptions);
```

When working with ES6 modules, you need to import the object type:
```js
import { RouteDirections, RoutingOption, TravelMode } from '@geoapify/route-directions';
```

## Route Directions options
Here are the options you can specify when creating a route directions object:

| Option | Type | Default value |  Description |
| --- | --- | --- | --- |
| **mode** | `walk`, `hike`, `scooter`,  `motorcycle`, `drive`, `light_truck`, `medium_truck`, `truck`, `bicycle`, `mountain_bike`, `road_bike`, `bus` | `drive` | Travel or transportation mode |
| **waypoints** | array of {lat: *number*, lon: *number*, address: *string*} | [{}, {}] | Waypoints containing geographical coordinates and address information |
| **avoidHighways** | *boolean* | `false` | Avoid highways when calculating the route |
| **avoidTolls** | *boolean* | `false` | Avoid tolls when calculating the route |
| **avoidFerries** | *boolean* | `false` | Avoid ferries when calculating the route |
| **elevation** | *boolean* | `false` | Include elevation data and ranges to the route |
| **units** | `metric`, `imperial` | `metric` | Distance units |
| **lang** | `bg`, `ca`, `cs`, `da`, `de`, `el`, `en`, `es`, `et`, `fi`, `fr`, `hi`, `hu`, `it`, `ja`, `nl`, `pl`, `pt`, `ro`, `ru`, `sk`, `sl`, `sv`, `tr`, `uk` | `en` | Language |
| **noStopover** | *boolean* | `false` | Don't let to add more than two waypoints |
| **supportedModes** | array of [ `walk`, `hike`, `scooter`,  `motorcycle`, `drive`, `light_truck`, `medium_truck`, `truck`, `bicycle`, `mountain_bike`, `road_bike`, `bus`] | [`walk`, `bicycle`, `drive`, `medium_truck`] | Travel modes to be shown on the control |
| **supportedOptions** | array of [`tolls`, `ferries`, `highways`, `units`] | [] | Options to be shown on the control |
| **calculateRouteTrigger** | `auto`, `buttonClick`, `functionCall` | `auto` | Defines how the route calculation is triggered: `auto` - the route calculated automatically when waypoints or options are changed; `buttonClick` - the route calculation is triggered when the "Calculate" button is clicked; `functionCall` - the route calculated when the `calculate()` method is called |
| **labels** | { [ key: *string* ]: *string* } | Check "Localization options" |  The control includes labels for a better user experience. You can customize/localize those labels by overriding the default ones. |
| **debounceDelay** | *number* | 2000 | Delay (in milliseconds) after the last user interaction is used as a timeout for the route calculation. This helps to avoid unnecessary API calls when **calculateRouteTrigger** is `auto`. |

In addition, you can provide geocoding options for waypoint inputs. For example, you can specify language, preferred locations, and filters. Learn more about Geoapify Geocoder Option on the [@geoapify/geocoder-autocomplete](https://www.npmjs.com/package/@geoapify/geocoder-autocomplete) page.

#### Routing for walking, hiking, cycling modes

``` js
const routeDirections = new RouteDirections(document.getElementById("route-directions"), apiKey, {
  mode: 'walk',
  supportedModes: ['walk', 'hike', 'bicycle', 'mountain_bike', 'road_bike']
});
```

#### Predefine waypoints

``` js
const routeDirections = new RouteDirections(document.getElementById("route-directions"), apiKey, {
  waypoints: [
    { address: "Paris, France" },
    { address: "Lyon, France" },
    { address: "Grenoble, France" },
  ]
});
```

#### Add options and the "Calculate button"
```js
const routeDirections2 = new RouteDirections(document.getElementById("route-directions"), apiKey, {
  supportedOptions: ['highways', 'tolls', 'ferries', 'units'],
  calculateRouteTrigger: 'buttonClick'
});
```

## Route Direction methods
The Driving Directions control provides methods that help you integrate better the Routing API with other objects on the website. For example, you can use a map to show your route, or you can use buttons to start or stop directions:

| Method | Description | Example |
| --- | --- | --- |
| **getOptions()** | Returns the current RouteDirections options object | `const option = routeDitections.getOptions();`|
| **addLocation(lat: number, lon: number, address?: string)** | Add a new location to an existing but empty waypoint. The method was handy to define locations by clicking on a map. | `routeDitections.addlocation(event.lat, event.lon);`
| **calculate()** | Calculate the route. This lets you trigger the route calculation outside the control. | `routeDitections.calculate();`
| **on(operation, callback)** | Add a callback on an operation. Possible operations - `modeChanged`, `optionChanged`, `waypointChanged`, `routeCalculated`. | `routeDirections.on('routeCalculated', (route: GeoJSON.Feature) => { ... });` |
| **off(operation, callback)** | Remove a callback. | `routeDirections.off('routeCalculated', myCallback);` |

#### Add a callback for the calculated route

```js
const routeDirections = new RouteDirections(document.getElementById("route-directions"), apiKey);

routeDirections.on('waypointChanged', (waypoint, reason) => {
    console.log(waypoint);
    console.log(reason);
})

routeDirections.on('modeChanged', (mode: TravelMode) => {
  console.log(mode);
});

routeDirections.on('optionChanged', (option: RoutingOption) => {
  console.log(option);
});

routeDirections.on('routeCalculated', (geojson: any) => {
  console.log(geojson);
});
```

#### Add a waypoint location on a Leaflet map click

```js
map.on('click', (event) => {
  routeDirections.addLocation(event.latlng.lat, event.latlng.lng)
});
```

## Customize and localize the control
You can customize and localize the labels found on the RouteDirections controls by providing the custom "labels" object in the options object:

| Label | Default value|
| --- | --- |
| **avoid** | "Avoid:" |
| **units** | "Units:" |
| **addDestination** | "Add destination" |
| **avoidTolls** | "Tolls" |
| **avoidFerries** | "Ferries" |
| **avoidHighways** | "Highways" |
| **unitsMiles** | "Miles" |
| **unitsKilometers** | "Kilometers" |
| **calculateButton** | "Calculate" |
| **noRouteFound** | "No route found" |
| **warning.min2Waypoints** | "Choose at least two waypoints to calculate a route" |

#### Localize the control
```js
const routeDirections2 = new RouteDirections(this.container2.nativeElement, apiKey, {
  labels: {
    "avoid": "Избегать:",
    "addDestination": "Добавить новый пункт назначения",
    "avoidTolls": "Платные дороги",
    "avoidFerries": "Паромы",
    "avoidHighways": "Автострады",
    "calculateButton": "Расчитать",
    "noRouteFound": "Путь не найден"
  }
});
```

## Style the controls

You can customize the styling of the control. There are the CSS classes you can use for the customization:

| CSS class | Description |
| --- | --- |
| **.geoapify-route-directions-add-destination** | Add destination button |
| **.geoapify-route-directions-mode-button** | Mode button |
| **.geoapify-route-directions-message** | Error message |
| **.geoapify-route-directions-generate-button** | Calculate button |
