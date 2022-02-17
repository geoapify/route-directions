import { GeocoderAutocomplete } from "@geoapify/geocoder-autocomplete";
import type { GeocoderAutocompleteOptions, SupportedLanguage } from "@geoapify/geocoder-autocomplete";
export class RouteDirections {

  private MIN_ADDRESS_LENGTH = 3;

  private callbacksRouteCalculated: RouteCalculatedCallbackType[] = [];
  private callbacksOptionsChanged: OptionChangeCallbackType[] = [];
  private callbacksModeChanged: ModeChangeCallbackType[] = [];
  private callbacksWaypointsChanged: WaypointChangeCallbackType[] = [];

  private routingUrl = "https://api.geoapify.com/v1/routing";
  private geocodingAddress = "https://api.geoapify.com/v1/geocode/search";
  private reverseGeocodingAddress = "https://api.geoapify.com/v1/geocode/reverse";
  private allowedModes = ['walk', 'hike', 'scooter', 'motorcycle', 'drive', 'light_truck', 'medium_truck', 'truck', 'bicycle', 'mountain_bike', 'road_bike', 'bus']

  private dragElement: HTMLElement;

  private labels = {
    "avoid": "Avoid:",
    "units": "Units:",
    "addDestination": "Add destination",
    "avoidTolls": "Tolls",
    "avoidFerries": "Ferries",
    "avoidHighways": "Highways",
    "unitsMiles": "Miles",
    "unitsKilometers": "Kilometers",
    "calculateButton": "Calculate",
    "noRouteFound": "No route found",
    "warning.min2Waypoints": "Choose at least two waypoints to calculate a route"
  };

  private geocoderOptions: GeocoderAutocompleteOptions = {
    skipDetails: true,
    skipIcons: true
  }

  private options: RouteDirectionsOptions = {
    mode: 'drive',
    avoidTolls: false,
    avoidFerries: false,
    avoidHighways: false,
    elevation: false,
    units: "metric",
    calculateRouteTrigger: 'auto',
    supportedModes: ['walk', 'bicycle', 'drive', 'medium_truck'],
    supportedOptions: [],
    debounceDelay: 2000
  };

  /* We set timeout before sending a request to avoid unnecessary calls */
  private currentTimeout: number;
  /* Active request promise reject function. To be able to cancel the promise when a new request comes */
  private currentPromiseReject: any;
  private previousRoutingAPICallURL: string;

  constructor(private container: HTMLElement, private apiKey: string, options?: RouteDirectionsOptions, geocoderOptions?: GeocoderAutocompleteOptions) {
    this.options = options ? { ...this.options, ...options } : this.options;
    this.geocoderOptions = geocoderOptions ? { ...this.geocoderOptions, ...geocoderOptions } : this.geocoderOptions;
    this.labels = this.options.labels ? { ... this.labels, ...this.options.labels } : this.labels;

    this.checkAndfillWaypoints();
    this.generateControls();
  }

  public calculate() {
    return new Promise<any>((resolve, reject) => {
      const waypointsWithCoords = this.options.waypoints.filter(waypoint => waypoint.lat && waypoint.lon);
      if (waypointsWithCoords.length >= 2) {
        const waypoints = waypointsWithCoords.map(location => location.lat + ',' + location.lon).join('|');
        let url = `${this.routingUrl}?waypoints=${waypoints}&mode=${this.options.mode}`;

        url += this.options.lang ? `&lang=${this.options.lang}` : '';

        const avoids = [];
        if (this.options.avoidTolls) {
          avoids.push("tolls");
        }

        if (this.options.avoidFerries) {
          avoids.push("ferries");
        }

        if (this.options.avoidHighways) {
          avoids.push("highways");
        }

        url += avoids.length ? `&avoid=${avoids.join("|")}` : '';

        const details = ["instruction_details"];

        if (this.options.elevation) {
          details.push("elevation");
        }

        url += details.length ? `&details=${details.join(",")}` : '';

        if (this.options.units === 'imperial') {
          url += "&units=imperial"
        }

        url += `&apiKey=${this.apiKey}`;

        if (this.previousRoutingAPICallURL === url) {
          // Do nothing when the call is repeated          
          return;
        }

        this.inProgress(true);
        fetch(url).then(response => response.json()).then(result => {
          this.previousRoutingAPICallURL = url;
          if (result?.features?.length) {
            this.onRouteCalculated(result.features[0]);
            resolve(result.features[0]);
          } else if (result.features && result.features?.length === 0) {
            this.showMessage(this.labels.noRouteFound);
            reject(this.labels.noRouteFound);
          } else if (result.error) {
            this.showMessage(result, true);
            reject(result.error);
          }
          this.inProgress(false);
        }, () => {
          this.inProgress(false);
        });
      } else if (this.options.calculateRouteTrigger !== 'auto') {
        this.showMessage(this.labels["warning.min2Waypoints"], true);
        reject(this.labels["warning.min2Waypoints"]);
      }
    });
  }

  public on(operation: 'modeChanged' | 'optionChanged' | 'waypointChanged' | 'routeCalculated',
    callback: WaypointChangeCallbackType | ModeChangeCallbackType | OptionChangeCallbackType | RouteCalculatedCallbackType) {
    if (operation === 'modeChanged' && this.callbacksModeChanged.indexOf(callback as ModeChangeCallbackType) < 0) {
      this.callbacksModeChanged.push(callback as ModeChangeCallbackType);
    }

    if (operation === 'optionChanged' && this.callbacksOptionsChanged.indexOf(callback as OptionChangeCallbackType) < 0) {
      this.callbacksOptionsChanged.push(callback as OptionChangeCallbackType);
    }

    if (operation === 'waypointChanged' && this.callbacksWaypointsChanged.indexOf(callback as WaypointChangeCallbackType) < 0) {
      this.callbacksWaypointsChanged.push(callback as WaypointChangeCallbackType);
    }

    if (operation === 'routeCalculated' && this.callbacksRouteCalculated.indexOf(callback as RouteCalculatedCallbackType) < 0) {
      this.callbacksRouteCalculated.push(callback as RouteCalculatedCallbackType);
    }
  }

  public off(operation: 'modeChanged' | 'optionChanged' | 'waypointChanged' | 'routeCalculated', callback: any) {
    if (operation === 'modeChanged' && this.callbacksModeChanged.indexOf(callback) >= 0) {
      this.callbacksModeChanged.splice(this.callbacksModeChanged.indexOf(callback), 1);
    }

    if (operation === 'optionChanged' && this.callbacksOptionsChanged.indexOf(callback) >= 0) {
      this.callbacksOptionsChanged.splice(this.callbacksOptionsChanged.indexOf(callback), 1);
    }

    if (operation === 'waypointChanged' && this.callbacksWaypointsChanged.indexOf(callback) >= 0) {
      this.callbacksWaypointsChanged.splice(this.callbacksWaypointsChanged.indexOf(callback), 1);
    }

    if (operation === 'routeCalculated' && this.callbacksRouteCalculated.indexOf(callback) >= 0) {
      this.callbacksRouteCalculated.splice(this.callbacksRouteCalculated.indexOf(callback), 1);
    }
  }

  public addLocation(lat: number, lon: number, address?: string) {
    const waypoint = this.options.waypoints.find(waypoint => !waypoint.lon || !waypoint.lat);
    if (waypoint) {
      waypoint.lat = lat;
      waypoint.lon = lon;
      waypoint.address = address;
      this.onWaypointsChanged(waypoint, 'changed');

      if (address && waypoint.geocoder) {
        waypoint.geocoder.setValue(address);
      }

      const url = `${this.reverseGeocodingAddress}?lat=${waypoint.lat}&lon=${waypoint.lon}&format=json&apiKey=${this.apiKey}`;

      fetch(url).then(result => result.json()).then(result => {
        if (result && result.results?.length) {
          waypoint.address = result.results[0].formatted;
          if (waypoint.geocoder) {
            waypoint.geocoder.setValue(result.results[0].formatted);
          }
        } else {
          // address is not found
          waypoint.address = `${waypoint.lat} ${waypoint.lon}`;
          if (waypoint.geocoder) {
            waypoint.geocoder.setValue(`${waypoint.lat} ${waypoint.lon}`);
          }
        }
        this.updateWaypointControls();
      }, err => {
        this.showMessage(err, true);
      });
    }
  }

  public getOptions(): RouteDirectionsOptions {
    return this.options;
  }

  private sendAutoRequest() {
    if (this.options.calculateRouteTrigger !== 'auto') {
      return;
    }

    // Cancel previous timeout
    if (this.currentTimeout) {
      window.clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    // Cancel previous request
    if (this.currentPromiseReject) {
      this.currentPromiseReject({
        canceled: true
      });
      this.currentPromiseReject = null;
      this.previousRoutingAPICallURL = null;
    }

    this.currentTimeout = window.setTimeout(() => {
      /* Create a new promise and send geocoding request */
      const promise = new Promise<void>((resolve, reject) => {
        this.currentPromiseReject = reject;
        this.calculate().then(() => {
          this.currentPromiseReject = null;
          resolve();
        });
      });
    }, this.options.debounceDelay);
  }

  private inProgress(value: boolean) {
    if (value) {
      this.container.querySelector(".geoapify-route-directions-in-progress-container").classList.add("visible");
    } else {
      this.container.querySelector(".geoapify-route-directions-in-progress-container").classList.remove("visible");
    }
  }

  private onWaypointsChanged(waypoint: Waypoint, reason: 'added' | 'removed' | 'changed' | 'moved') {
    this.callbacksWaypointsChanged.forEach(callback => callback(waypoint, reason));
    this.showMessage(null);
    this.sendAutoRequest();
  }

  private onOptionsChanged(option: RoutingOption) {
    this.callbacksOptionsChanged.forEach(callback => callback(option));
    this.showMessage(null);
    this.sendAutoRequest();
  }

  private onModeChanged(mode: TravelMode) {
    this.callbacksModeChanged.forEach(callback => callback(mode));
    this.showMessage(null);
    this.sendAutoRequest();
  }

  private onRouteCalculated(geojson: any) {
    this.callbacksRouteCalculated.forEach(callback => callback(geojson));
    this.showMessage("");
  }

  private checkAndfillWaypoints() {
    if (this.options.waypoints && this.options.waypoints.length > 2 && this.options.noStopover) {
      this.options.waypoints.length = 2;
    }

    if (!this.options.waypoints || !this.options.waypoints.length) {
      this.options.waypoints = [{}, {}];
    }

    if (this.options.waypoints.length === 1) {
      this.options.waypoints.push({});
    }

    const promises: Promise<void>[] = [];
    
    this.options.waypoints.forEach(waypoint => {
      if (waypoint.address && waypoint.address.length < this.MIN_ADDRESS_LENGTH && (!waypoint.lat || !waypoint.lon)) {
        // skip this address
        waypoint.address = "";
        this.updateWaypointControls();
      } else if (waypoint.address && (!waypoint.lat || !waypoint.lon)) {
        // geocode this address
        const url = `${this.geocodingAddress}?text=${encodeURIComponent(waypoint.address)}&format=json&apiKey=${this.apiKey}`;
        promises.push(new Promise<void>((resolve) => {
          fetch(url).then(response => response.json()).then(result => {
            if (result && result.results && result.results.length && result.results[0].lat && result.results[0].lon) {
              waypoint.address = result.results[0].formatted;
              waypoint.lat = result.results[0].lat;
              waypoint.lon = result.results[0].lon;
  
              if (waypoint.geocoder) {
                waypoint.geocoder.setValue(result.results[0].formatted);
              }
            } else {
              // address is not found
              waypoint.address = "";
              if (waypoint.geocoder) {
                waypoint.geocoder.setValue("");
              }
              this.showMessage(result, true);
            }
            this.updateWaypointControls();
            resolve();
          }, err => {
            this.showMessage(err);
            resolve();
          });
        }));
      } else if (waypoint.lat && waypoint.lon && (!waypoint.address || waypoint.address.length < this.MIN_ADDRESS_LENGTH)) {
        const url = `${this.reverseGeocodingAddress}?lat=${waypoint.lat}&lon=${waypoint.lon}&format=json&apiKey=${this.apiKey}`;

        promises.push(new Promise<void>(resolve => {
          fetch(url).then(result => result.json()).then(result => {
            if (result && result.results?.length) {
              waypoint.address = result.results[0].formatted;
              if (waypoint.geocoder) {
                waypoint.geocoder.setValue(result.results[0].formatted);
              }
            } else {
              // address is not found
              waypoint.address = `${waypoint.lat} ${waypoint.lon}`;
              if (waypoint.geocoder) {
                waypoint.geocoder.setValue(`${waypoint.lat} ${waypoint.lon}`);
              }
            }
            this.updateWaypointControls();
            resolve();
          }, err => {
            this.showMessage(err, true);
            resolve();
          });
        }));
      }
    });

    Promise.all(promises).then(() => {
      this.sendAutoRequest();
    });
  }

  private updateWaypointControls() {
    const allWaypointContainers = this.container.querySelectorAll('.geoapify-route-directions-waypoint');
    const canDelete = allWaypointContainers.length > 2;

    // show switch button
    if (!canDelete) {
      this.container.querySelector('.geoapify-route-directions-switch-waypoints').classList.add("visible");
    } else {
      this.container.querySelector('.geoapify-route-directions-switch-waypoints').classList.remove("visible");
    }

    Array.from(allWaypointContainers).forEach((container, index) => {

      // allow delete buttons
      if (canDelete) {
        container.classList.add('removable');
      } else {
        container.classList.remove('removable');
      }

      // icons
      if (index === allWaypointContainers.length - 1) {
        container.querySelector(".geoapify-route-directions-waypoint-icon").classList.add('last');
      } else {
        container.querySelector(".geoapify-route-directions-waypoint-icon").classList.remove('last');
      }
    });

  }

  private updateModeButtons() {
    const buttonElements = this.container.querySelectorAll('.geoapify-route-directions-mode-button');
    Array.from(buttonElements).forEach((buttonElem) => {
      let mode;
      (buttonElem as HTMLElement).classList.forEach(className => {
        if (className.startsWith("mode__")) {
          mode = className.replace("mode__", "");
        }
      });

      if (mode === this.options.mode) {
        (buttonElem as HTMLElement).classList.add('active');
      } else {
        (buttonElem as HTMLElement).classList.remove('active');
      }
    });
  }

  private generateControls() {
    if (this.container.style.position !== 'absolute') {
      this.container.style.position = "relative";
    }

    // isProgress container
    const inProgressContainer = document.createElement("div");
    inProgressContainer.classList.add("geoapify-route-directions-in-progress-container");
    inProgressContainer.innerHTML = `<div class="lds-facebook"><div></div><div></div><div></div></div>`;
    this.container.appendChild(inProgressContainer);

    // generate modes
    const checkedModes = this.options.supportedModes.filter(mode => this.allowedModes.indexOf(mode) >= 0);
    const modesContainer = document.createElement("div");
    modesContainer.classList.add("geoapify-route-directions-mode-container");

    checkedModes.forEach(mode => {
      const modeButton = document.createElement("div");
      modeButton.classList.add("geoapify-route-directions-mode-button");
      modeButton.classList.add(`mode__${mode}`);
      this.addIcon(modeButton, mode);
      modeButton.addEventListener("click", () => {
        this.options.mode = mode;
        this.updateModeButtons();
        this.onModeChanged(mode);
      });

      modesContainer.appendChild(modeButton);
    });

    this.container.appendChild(modesContainer);

    // generate waypoint inputs
    const waypointsContainerAndSwapButtonConrainer = document.createElement("div");
    waypointsContainerAndSwapButtonConrainer.classList.add("geoapify-route-directions-waypoint-and-swap-button-container");
    this.container.appendChild(waypointsContainerAndSwapButtonConrainer);

    const waypointsContainer = document.createElement("div");
    waypointsContainer.classList.add("geoapify-route-directions-waypoint-container");
    waypointsContainerAndSwapButtonConrainer.appendChild(waypointsContainer);

    this.options.waypoints.forEach((wayPointData, index) => {
      this.generateWaypoint(waypointsContainer, wayPointData);
    });

    // swap button
    const switchButton = document.createElement("div");
    switchButton.classList.add("geoapify-route-directions-switch-waypoints");
    this.addIcon(switchButton, 'swap-vert');

    switchButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.swapWaypoints();
    });

    waypointsContainerAndSwapButtonConrainer.appendChild(switchButton);

    // add destination button
    if (!this.options.noStopover) {
      const addDestination = document.createElement("div");
      addDestination.classList.add("geoapify-route-directions-add-destination");

      const addDestinationIcon = document.createElement("span");
      addDestinationIcon.classList.add("icon");
      this.addIcon(addDestinationIcon, 'plus-circle');
      addDestination.appendChild(addDestinationIcon);

      const addDestinationText = document.createElement("span");
      addDestinationText.classList.add("text");
      addDestinationText.textContent = this.labels["addDestination"];
      addDestination.appendChild(addDestinationText);

      addDestination.addEventListener('click', (e) => {
        this.addWaypoint();
      });

      this.container.appendChild(addDestination);
    }

    // options 
    const optionsContainer = document.createElement("div");
    optionsContainer.classList.add("geoapify-route-directions-options-container");
    this.generateOptions(optionsContainer);
    this.container.appendChild(optionsContainer);

    if (this.options.calculateRouteTrigger === 'buttonClick') {
      const generateRouteButtonContainer = document.createElement("div");
      generateRouteButtonContainer.classList.add("geoapify-route-directions-generate-button-container");
      const button = document.createElement("button");
      button.classList.add("geoapify-route-directions-generate-button");
      button.textContent = this.labels.calculateButton;

      button.addEventListener('click', () => {
        this.calculate();
      });

      generateRouteButtonContainer.appendChild(button);
      this.container.appendChild(generateRouteButtonContainer);
    }

    // generate message container
    const messageContainer = document.createElement("div");
    messageContainer.classList.add("geoapify-route-directions-message");
    this.container.appendChild(messageContainer);

    this.updateWaypointControls();
    this.updateModeButtons();
  }

  private generateOptions(container: HTMLElement) {

    const optionsLine1 = document.createElement("div");
    optionsLine1.classList.add("geoapify-route-directions-options-line");

    if (this.options.supportedOptions.indexOf("highways") >= 0) {
      const highwayCheckbox = document.createElement('label');
      highwayCheckbox.classList.add("geoapify-route-directions-options-checkbox");
      const inputElement = document.createElement("input");
      inputElement.setAttribute("type", "checkbox");
      inputElement.checked = this.options.avoidHighways || false;

      inputElement.addEventListener("change", (event) => {
        this.options.avoidHighways = (event.currentTarget as HTMLInputElement).checked;
        this.onOptionsChanged("highways");
      });

      highwayCheckbox.appendChild(inputElement);
      const textElement = document.createElement("span");
      textElement.classList.add("text");
      textElement.textContent = this.labels.avoidHighways;
      highwayCheckbox.appendChild(textElement);

      optionsLine1.appendChild(highwayCheckbox);
    }

    if (this.options.supportedOptions.indexOf("tolls") >= 0) {
      const checkbox = document.createElement('label');
      checkbox.classList.add("geoapify-route-directions-options-checkbox");
      const inputElement = document.createElement("input");
      inputElement.setAttribute("type", "checkbox");
      inputElement.checked = this.options.avoidTolls || false;

      inputElement.addEventListener("change", (event) => {
        this.options.avoidTolls = (event.currentTarget as HTMLInputElement).checked;
        this.onOptionsChanged("tolls");
      });

      checkbox.appendChild(inputElement);
      const textElement = document.createElement("span");
      textElement.classList.add("text");
      textElement.textContent = this.labels.avoidTolls;
      checkbox.appendChild(textElement);

      optionsLine1.appendChild(checkbox);
    }

    if (this.options.supportedOptions.indexOf("ferries") >= 0) {
      const checkbox = document.createElement('label');
      checkbox.classList.add("geoapify-route-directions-options-checkbox");
      const inputElement = document.createElement("input");
      inputElement.setAttribute("type", "checkbox");
      inputElement.checked = this.options.avoidFerries || false;

      inputElement.addEventListener("change", (event) => {
        this.options.avoidFerries = (event.currentTarget as HTMLInputElement).checked;
        this.onOptionsChanged("ferries");
      });

      checkbox.appendChild(inputElement);
      const textElement = document.createElement("span");
      textElement.classList.add("text");
      textElement.textContent = this.labels.avoidFerries;
      checkbox.appendChild(textElement);

      optionsLine1.appendChild(checkbox);
    }

    if (optionsLine1.hasChildNodes()) {
      const avoidLabel = document.createElement("span")
      avoidLabel.classList.add("geoapify-route-directions-options-label");
      avoidLabel.textContent = this.labels.avoid;
      optionsLine1.insertBefore(avoidLabel, optionsLine1.firstChild);

      container.appendChild(optionsLine1);
    }

    const optionsLine2 = document.createElement("div");
    optionsLine2.classList.add("geoapify-route-directions-options-line");

    if (this.options.supportedOptions.indexOf("units") >= 0) {
      const radiobutton1 = document.createElement('label');
      radiobutton1.classList.add("geoapify-route-directions-options-radiobutton");
      const inputElement1 = document.createElement("input");
      inputElement1.setAttribute("type", "radio");
      inputElement1.setAttribute("name", "units");
      inputElement1.setAttribute("value", "imperial");
      inputElement1.checked = this.options.units === 'imperial';

      inputElement1.addEventListener("change", (event) => {
        this.options.units = (event.currentTarget as HTMLInputElement).checked ? 'imperial' : 'metric';
        this.onOptionsChanged("units");
      });

      radiobutton1.appendChild(inputElement1);
      const textElement1 = document.createElement("span");
      textElement1.classList.add("text");
      textElement1.textContent = this.labels.unitsMiles;
      radiobutton1.appendChild(textElement1);

      const radiobutton2 = document.createElement('label');
      radiobutton1.classList.add("geoapify-route-directions-options-radiobutton");
      const inputElement2 = document.createElement("input");
      inputElement2.setAttribute("type", "radio");
      inputElement2.setAttribute("name", "units");
      inputElement2.setAttribute("value", "metric");

      inputElement2.addEventListener("change", (event) => {
        this.options.units = (event.currentTarget as HTMLInputElement).checked ? 'metric' : 'imperial';
        this.onOptionsChanged("units");
      });

      inputElement2.checked = this.options.units !== 'imperial';
      radiobutton2.appendChild(inputElement2);
      radiobutton2.classList.add("geoapify-route-directions-options-radiobutton");
      const textElement2 = document.createElement("span");
      textElement2.classList.add("text");
      textElement2.textContent = this.labels.unitsKilometers;
      radiobutton2.appendChild(textElement2);

      optionsLine2.appendChild(radiobutton1);
      optionsLine2.appendChild(radiobutton2);
    }

    if (optionsLine2.hasChildNodes()) {
      const unitsLabel = document.createElement("span")
      unitsLabel.classList.add("geoapify-route-directions-options-label");
      unitsLabel.textContent = this.labels.units;
      optionsLine2.insertBefore(unitsLabel, optionsLine2.firstChild);
      container.appendChild(optionsLine2);
    }
  }

  private generateWaypoint(container: HTMLElement, waypointData: Waypoint) {
    const waypoint = document.createElement("div");
    waypoint.classList.add("geoapify-route-directions-waypoint");
    waypoint.setAttribute("draggable", "true");

    const waypointIcon = document.createElement("div");
    waypointIcon.classList.add("geoapify-route-directions-waypoint-icon");

    const waypointIconLine = document.createElement("span");
    waypointIconLine.classList.add("geoapify-route-directions-waypoint-icon-line");
    waypointIcon.appendChild(waypointIconLine);

    const waypointIconIcon = document.createElement("span");
    waypointIconIcon.classList.add("geoapify-route-directions-waypoint-icon-icon");
    waypointIcon.appendChild(waypointIconIcon);
    waypoint.appendChild(waypointIcon);

    const geocoderElement = document.createElement("div");
    geocoderElement.classList.add("geoapify-route-directions-waypoint-address-input");
    geocoderElement.setAttribute("draggable", "true");
    geocoderElement.addEventListener("dragstart", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    const geocoder = new GeocoderAutocomplete(geocoderElement, this.apiKey, this.geocoderOptions);
    geocoder.setValue(waypointData.address || '');
    waypointData.geocoder = geocoder;

    geocoder.on('select', (location) => {
      if (location) {
        waypointData.address = location.properties.formatted;
        waypointData.lon = location.properties.lon;
        waypointData.lat = location.properties.lat;
      } else {
        delete waypointData.address;
        delete waypointData.lon;
        delete waypointData.lat;
      }

      this.onWaypointsChanged(waypointData, 'changed');
    });

    waypoint.appendChild(geocoderElement);

    const removeButtonElement = document.createElement("div");
    removeButtonElement.classList.add("geoapify-route-directions-waypoint-remove-button-container");

    const removeButton = document.createElement("div");
    removeButton.classList.add("geoapify-route-directions-waypoint-remove-button");

    removeButton.setAttribute("draggable", "true");
    removeButton.addEventListener("dragstart", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    this.addIcon(removeButton, 'close-circle');
    removeButtonElement.appendChild(removeButton);
    removeButtonElement.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      this.removeWaypoint(waypointData, waypoint);
    });

    waypoint.appendChild(removeButtonElement);

    container.appendChild(waypoint);
    this.addDradAndDropFunctionality(waypoint);
  }

  showMessage(error: any, isError?: boolean) {

    const textContainer = this.container.querySelector('.geoapify-route-directions-message');

    if (!error) {
      textContainer.textContent = '';
    } else if (error.error && error.message) {
      // this error comes from an API call
      textContainer.textContent = `${error.error}: ${error.message}`;
    } else {
      textContainer.textContent = error;
    }

    if (isError) {
      textContainer.classList.add("error");
    } else {
      textContainer.classList.remove("error");
    }
  }

  /* Drag events */
  private handleDragStart(e: DragEvent) {
    this.dragElement = e.target as HTMLElement;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(this.dragElement.querySelector(".geoapify-route-directions-waypoint-address-input"), 0, 0);
    this.dragElement.classList.add('dragElem');
  }


  private handleDragEnd(e: MouseEvent) {
    const element = (e.target as HTMLElement);
    if (element) {
      element.classList.remove('dragElem');
    }

    this.container.querySelectorAll(".geoapify-route-directions-waypoint").forEach(element => element.classList.remove("over"))
  }

  private handleDragOver(e: DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const element = (e.target as HTMLElement).closest(".geoapify-route-directions-waypoint");
    if (element) {
      const isBottom = ((element.nextSibling !== this.dragElement) && (e.clientY - element.getBoundingClientRect().top) > element.getBoundingClientRect().height / 2)
        || element.previousSibling === this.dragElement;
      if (isBottom) {
        element.classList.add("bottom")
      } else {
        element.classList.remove("bottom");
      }
    }

    return false;
  }

  private getAllSiblings(itemElement: Element): HTMLElement[] {
    var result: HTMLElement[] = [],
      node = itemElement.parentNode.firstChild;

    while (node) {
      if (node !== itemElement && node.nodeType === Node.ELEMENT_NODE)
        result.push(node as HTMLElement);
      node = node.nextSibling;
    }

    return result;
  }

  private handleDragEnter(e: DragEvent) {
    e.preventDefault();

    const itemElement = (e.target as HTMLElement).closest(".geoapify-route-directions-waypoint");
    if (itemElement !== this.dragElement && itemElement) {
      itemElement.classList.add("over");
      this.getAllSiblings(itemElement).forEach(element => element.classList.remove("over"))
    }
  }

  private handleDragLeave(e: DragEvent) {
    const itemElement = (e.target as HTMLElement).closest(".geoapify-route-directions-waypoint");

    if (itemElement) {
      const withinElement = e.clientY - itemElement.getBoundingClientRect().top > 0 &&
        e.clientY - itemElement.getBoundingClientRect().top < itemElement.getBoundingClientRect().height

      if (!withinElement) {
        itemElement.classList.remove("over");
      }
    }
  }

  private handleDrop(e: DragEvent) {
    e.stopPropagation();

    this.dragElement.classList.remove('dragElem');
    let element = (e.target as HTMLElement).closest(".geoapify-route-directions-waypoint");

    // Don't do anything if dropping the same column we're dragging.
    if (this.dragElement !== element) {
      if (element.classList.contains("bottom")) {
        this.moveWaypoints(this.getElementIndex(this.dragElement), this.getElementIndex(element as HTMLElement) + 1)
        element.parentNode.insertBefore(this.dragElement, element.nextElementSibling);
      } else {
        this.moveWaypoints(this.getElementIndex(this.dragElement), this.getElementIndex(element as HTMLElement))
        element.parentNode.insertBefore(this.dragElement, element);
      }

      this.updateWaypointControls();
    }

    element.classList.remove('over');
    return false;
  }

  private addDradAndDropFunctionality(wayPointContainer: HTMLElement) {
    wayPointContainer.addEventListener('dragstart', this.handleDragStart.bind(this), false);
    wayPointContainer.addEventListener('dragenter', this.handleDragEnter.bind(this), false)
    wayPointContainer.addEventListener('dragover', this.handleDragOver.bind(this), false);
    wayPointContainer.addEventListener('dragleave', this.handleDragLeave.bind(this), false);
    wayPointContainer.addEventListener('drop', this.handleDrop.bind(this), false);
    wayPointContainer.addEventListener('dragend', this.handleDragEnd.bind(this), false);
  }

  private getElementIndex(element: HTMLElement) {
    if (!element) {
      return -1;
    }

    for (var i = 0; i < element.parentNode.children.length; i++) {
      if (element.parentNode.children[i] === element) {
        return i;
      }
    }

    return -1;
  }

  private moveWaypoints(fromIndex: number, toIndex: number) {
    var waypoint = this.options.waypoints[fromIndex];

    if (fromIndex < toIndex) {
      this.options.waypoints.splice(toIndex, 0, waypoint);
      this.options.waypoints.splice(fromIndex, 1);
    } else {
      this.options.waypoints.splice(fromIndex, 1);
      this.options.waypoints.splice(toIndex, 0, waypoint);
    }

    this.onWaypointsChanged(waypoint, 'moved');
  }

  private removeWaypoint(waypoint: Waypoint, waypointElement: HTMLElement) {
    const index = this.options.waypoints.indexOf(waypoint);

    this.options.waypoints.splice(index, 1);
    waypointElement.remove();
    this.updateWaypointControls();

    this.onWaypointsChanged(waypoint, 'removed');
  }

  private swapWaypoints() {
    if (this.options.waypoints.length !== 2) {
      return;
    }

    const container = this.container.querySelector(".geoapify-route-directions-waypoint-container");
    container.insertBefore(container.lastElementChild, container.firstElementChild);

    const waypoint = this.options.waypoints[1];
    this.options.waypoints[1] = this.options.waypoints[0];
    this.options.waypoints[0] = waypoint;
    this.updateWaypointControls();

    this.onWaypointsChanged(this.options.waypoints[0], 'moved');
    this.onWaypointsChanged(this.options.waypoints[1], 'moved');
  }

  private addWaypoint() {
    const waypoint = {};
    this.options.waypoints.push(waypoint);
    const container = this.container.querySelector(".geoapify-route-directions-waypoint-container");
    this.generateWaypoint(container as HTMLElement, waypoint);
    this.updateWaypointControls();
    this.onWaypointsChanged(waypoint, 'added');
  }

  private addIcon(element: HTMLElement, icon: string) {

    // Material Icons: https://fonts.google.com/icons?selected=Material+Icons
    const icons: { [key: string]: any } = {
      "close": {
        path: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
        viewbox: "0 0 24 24"
      },
      "close-circle": {
        path: "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z",
        viewbox: "0 0 24 24"
      },
      "swap-vert": {
        path: "M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z",
        viewbox: "0 0 24 24"
      },
      "plus-circle": {
        path: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z",
        viewbox: "0 0 24 24"
      },
      'walk': {
        path: "M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7",
        viewbox: "0 0 24 24"
      },
      'hike': {
        path: "M13.5,5.5c1.1,0,2-0.9,2-2s-0.9-2-2-2s-2,0.9-2,2S12.4,5.5,13.5,5.5z M17.5,10.78c-1.23-0.37-2.22-1.17-2.8-2.18l-1-1.6 c-0.41-0.65-1.11-1-1.84-1c-0.78,0-1.59,0.5-1.78,1.44S7,23,7,23h2.1l1.8-8l2.1,2v6h2v-7.5l-2.1-2l0.6-3c1,1.15,2.41,2.01,4,2.34V23 H19V9h-1.5L17.5,10.78z M7.43,13.13l-2.12-0.41c-0.54-0.11-0.9-0.63-0.79-1.17l0.76-3.93c0.21-1.08,1.26-1.79,2.34-1.58l1.16,0.23 L7.43,13.13z",
        viewbox: "0 0 24 24"
      },
      'scooter': {
        g: '<path d="M19,7c0-1.1-0.9-2-2-2h-3v2h3v2.65L13.52,14H10V9H6c-2.21,0-4,1.79-4,4v3h2c0,1.66,1.34,3,3,3s3-1.34,3-3h4.48L19,10.35V7 z M7,17c-0.55,0-1-0.45-1-1h2C8,16.55,7.55,17,7,17z"/><rect height="2" width="5" x="5" y="6"/><path d="M19,13c-1.66,0-3,1.34-3,3s1.34,3,3,3s3-1.34,3-3S20.66,13,19,13z M19,17c-0.55,0-1-0.45-1-1s0.45-1,1-1s1,0.45,1,1 S19.55,17,19,17z"/>',
        viewbox: "0 0 24 24"
      },
      'motorcycle': {
        path: "M20,11c-0.18,0-0.36,0.03-0.53,0.05L17.41,9H20V6l-3.72,1.86L13.41,5H9v2h3.59l2,2H11l-4,2L5,9H0v2h4c-2.21,0-4,1.79-4,4 c0,2.21,1.79,4,4,4c2.21,0,4-1.79,4-4l2,2h3l3.49-6.1l1.01,1.01C16.59,12.64,16,13.75,16,15c0,2.21,1.79,4,4,4c2.21,0,4-1.79,4-4 C24,12.79,22.21,11,20,11z M4,17c-1.1,0-2-0.9-2-2c0-1.1,0.9-2,2-2c1.1,0,2,0.9,2,2C6,16.1,5.1,17,4,17z M20,17c-1.1,0-2-0.9-2-2 c0-1.1,0.9-2,2-2s2,0.9,2,2C22,16.1,21.1,17,20,17z",
        viewbox: "0 0 24 24"
      },
      'drive': {
        path: "M18.92 5.01C18.72 4.42 18.16 4 17.5 4h-11c-.66 0-1.21.42-1.42 1.01L3 11v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 15c-.83 0-1.5-.67-1.5-1.5S5.67 12 6.5 12s1.5.67 1.5 1.5S7.33 15 6.5 15zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 10l1.5-4.5h11L19 10H5z",
        viewbox: "0 0 24 24"
      },
      'light_truck': {
        path: "M17 5H3c-1.1 0-2 .89-2 2v9h2c0 1.65 1.34 3 3 3s3-1.35 3-3h5.5c0 1.65 1.34 3 3 3s3-1.35 3-3H23v-5l-6-6zM3 11V7h4v4H3zm3 6.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm7-6.5H9V7h4v4zm4.5 6.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM15 11V7h1l4 4h-5z",
        viewbox: "0 0 24 24"
      },
      'medium_truck': {
        path: "M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z",
        viewbox: "0 0 24 24"
      },
      'truck': {
        path: "M 2.5054151,6.1751188 C 1.5907946,6.1468929 0.91892251,7.0614706 1.0491949,7.9290257 c 0,2.5705083 0,5.1410173 0,7.7115253 0.4854067,0 0.9708135,0 1.4562202,0 -0.05145,1.377013 1.4107818,2.50715 2.730993,2.115703 0.9433711,-0.226161 1.655859,-1.145352 1.6376679,-2.115703 0.067577,0.572742 0.2975838,1.295861 0.8294942,1.686275 1.0525842,0.934273 2.9037738,0.481796 3.4033858,-0.835069 0.170193,-0.471967 0.05658,-1.040934 0.717092,-0.851206 1.767291,0 3.534583,0 5.301875,0 -0.05145,1.377013 1.410782,2.50715 2.730994,2.115703 0.943371,-0.226161 1.655858,-1.145352 1.637667,-2.115703 0.485407,0 0.970814,0 1.456221,0 0,-1.213517 0,-2.427034 0,-3.640551 -0.72811,-0.970814 -1.456221,-1.941627 -2.184331,-2.9124408 -0.72811,0 -1.45622,0 -2.18433,0 0,-0.9708135 0,-1.9416269 0,-2.9124404 -5.35891,0 -10.7178193,0 -16.0767289,0 z M 18.582144,10.179725 c 0.606758,0 1.213517,0 1.820275,0 0.475926,0.606758 0.951853,1.213517 1.427779,1.820275 -1.082685,0 -2.165369,0 -3.248054,0 0,-0.606758 0,-1.213517 0,-1.820275 z m -13.8923984,4.36866 c 0.9361805,-0.05191 1.4690175,1.239354 0.7727069,1.864873 -0.6255189,0.69631 -1.9167813,0.163473 -1.8648722,-0.772707 -0.012979,-0.587727 0.5040101,-1.105082 1.0921653,-1.092166 z m 4.404213,0 c 0.9361804,-0.05191 1.4690174,1.239353 0.7727072,1.864873 -0.625519,0.69631 -1.9167815,0.163474 -1.8648724,-0.772707 -0.012979,-0.587727 0.50401,-1.105082 1.0921652,-1.092166 z m 10.2162954,0 c 0.93618,-0.05191 1.469017,1.239354 0.772707,1.864873 -0.625519,0.69631 -1.916781,0.163473 -1.864872,-0.772707 -0.01298,-0.587727 0.50401,-1.105082 1.092165,-1.092166 z",
        viewbox: "0 0 24 24"
      },
      'bicycle': {
        path: "M18.18,10l-1.7-4.68C16.19,4.53,15.44,4,14.6,4H12v2h2.6l1.46,4h-4.81l-0.36-1H12V7H7v2h1.75l1.82,5H9.9 c-0.44-2.23-2.31-3.88-4.65-3.99C2.45,9.87,0,12.2,0,15c0,2.8,2.2,5,5,5c2.46,0,4.45-1.69,4.9-4h4.2c0.44,2.23,2.31,3.88,4.65,3.99 c2.8,0.13,5.25-2.19,5.25-5c0-2.8-2.2-5-5-5H18.18z M7.82,16c-0.4,1.17-1.49,2-2.82,2c-1.68,0-3-1.32-3-3s1.32-3,3-3 c1.33,0,2.42,0.83,2.82,2H5v2H7.82z M14.1,14h-1.4l-0.73-2H15C14.56,12.58,14.24,13.25,14.1,14z M19,18c-1.68,0-3-1.32-3-3 c0-0.93,0.41-1.73,1.05-2.28l0.96,2.64l1.88-0.68l-0.97-2.67c0.03,0,0.06-0.01,0.09-0.01c1.68,0,3,1.32,3,3S20.68,18,19,18z",
        viewbox: "0 0 24 24"
      },
      'mountain_bike': {
        path: "m 0,24 c 1.0483746,-0.970116 2.0967492,-1.940233 3.1451238,-2.910349 0.687195,0.188901 1.3743899,0.377803 2.0615849,0.566704 0.074467,0.252081 -0.1708548,1.106337 0.1515681,0.891506 0.9271663,-0.631226 1.8543325,-1.262452 2.7814987,-1.893678 0.1250469,0.362293 0.2500939,0.724585 0.3751408,1.086878 1.3501999,-0.776293 2.7003997,-1.552587 4.0505997,-2.32888 0.642873,0.19549 1.285745,0.39098 1.928618,0.58647 -0.127277,0.283555 -0.645555,0.868237 -0.01401,0.567389 2.239459,-0.59089 4.478919,-1.181779 6.718378,-1.772668 0.935096,1.376813 1.870193,2.753627 2.805289,4.13044 C 23.957138,23.257878 24.089456,23.771551 23.937553,24 15.958369,24 7.9791844,24 0,24 Z M 17.368208,9.4088866 C 16.495762,7.8768704 15.676923,6.3113665 14.769415,4.8012452 14.192639,3.9996558 13.13896,3.9319833 12.259493,4.157355 c -0.650058,0.1051652 -1.300117,0.2103305 -1.950176,0.3154957 0.106468,0.6581102 0.212935,1.3162205 0.319403,1.9743307 0.855543,-0.1384081 1.711087,-0.2768162 2.56663,-0.4152243 0.693356,1.238499 1.386712,2.476998 2.080068,3.715497 C 13.692663,10.003509 12.109907,10.259564 10.527152,10.515619 10.413979,10.220851 10.030833,9.7949273 10.073716,9.5759734 10.373468,9.451476 11.0236,9.5797778 11.087879,9.2853869 10.98806,8.6683735 10.88824,8.0513601 10.788421,7.4343467 9.1431456,7.7005161 7.4978702,7.9666855 5.8525948,8.2328549 5.9590626,8.8909653 6.0655303,9.5490756 6.1719981,10.207186 6.7478445,10.114027 7.323691,10.020867 7.8995374,9.9277077 8.7645873,11.476097 9.6296371,13.024487 10.494687,14.572877 9.5435276,15.028627 9.5970731,13.715609 9.0103071,13.244131 7.3360567,11.091839 3.8504884,10.850732 1.8756862,12.714557 c -1.89349434,1.592804 -2.27771979,4.608077 -0.8265331,6.612325 1.5012812,2.304528 4.9596557,2.801693 7.1134351,1.138433 1.2031446,-0.875523 1.9541548,-2.325049 1.9901008,-3.811107 1.382031,-0.223582 2.764063,-0.447165 4.146094,-0.670747 0.833906,2.46827 3.796455,3.856612 6.233864,2.970299 2.561793,-0.818455 4.120479,-3.884211 3.158947,-6.419742 C 22.94954,10.186324 20.304907,8.7594829 17.929506,9.307951 17.747649,9.3441724 17.530468,9.358979 17.368208,9.4088866 Z M 8.0993851,16.986388 C 7.8473918,18.935926 5.4464176,20.058984 3.7591603,19.117694 1.9703775,18.262883 1.5961278,15.561802 3.0917798,14.257334 4.4269623,12.93814 6.9479287,13.293533 7.7799819,15.012057 6.8520465,15.162176 5.924111,15.312296 4.9961756,15.462415 c 0.1064678,0.65811 0.2129355,1.316221 0.3194033,1.974331 0.9279354,-0.150119 1.8558708,-0.300239 2.7838062,-0.450358 z M 13.97938,14.009131 c -0.460677,0.07453 -0.921354,0.149055 -1.382031,0.223582 -0.346678,-0.61925 -0.693356,-1.238499 -1.040034,-1.857749 0.997037,-0.161299 1.994074,-0.322597 2.991111,-0.483896 -0.347528,0.650456 -0.552895,1.379325 -0.569046,2.118063 z m 5.475917,3.166123 c -1.770228,0.361248 -3.560535,-1.192079 -3.480313,-2.991203 -0.04759,-0.474995 0.465112,-2.350537 0.894752,-1.582458 0.395551,0.70855 0.791103,1.417099 1.186655,2.125649 0.582425,-0.323837 1.164849,-0.647674 1.747274,-0.971511 -0.461318,-0.82694 -0.922636,-1.653881 -1.383954,-2.480821 1.770368,-0.437427 3.622872,1.107999 3.567846,2.919897 0.04377,1.455879 -1.093956,2.779037 -2.53226,2.980447 z",
        viewbox: "0 0 24 24"
      },
      'road_bike': {
        path: "M 13.556641 5.2011719 L 13.556641 6.9003906 L 15.765625 6.9003906 L 17.005859 10.300781 L 12.917969 10.300781 L 12.613281 9.4511719 L 13.556641 9.4511719 L 13.556641 7.75 L 9.3066406 7.75 L 9.3066406 9.4511719 L 10.792969 9.4511719 L 12.339844 13.699219 L 11.771484 13.699219 C 11.39752 11.803901 9.8071682 10.402085 7.8183594 10.308594 C 5.4385874 10.189605 3.3574219 12.169056 3.3574219 14.548828 C 3.3574219 16.928599 5.2276499 18.798828 7.6074219 18.798828 C 9.6982213 18.798828 11.389021 17.363703 11.771484 15.400391 L 15.341797 15.400391 C 15.715761 17.295709 17.304159 18.697525 19.292969 18.791016 C 21.672741 18.901506 23.755859 16.929287 23.755859 14.541016 C 23.755859 12.161244 21.885631 10.291016 19.505859 10.291016 L 18.808594 10.291016 L 18.808594 10.300781 L 17.363281 6.3222656 C 17.116805 5.6508299 16.479556 5.2011719 15.765625 5.2011719 L 13.556641 5.2011719 z M 3.6972656 5.2324219 L 3.6972656 6.3886719 L 10.015625 6.3886719 L 10.015625 5.2324219 L 3.6972656 5.2324219 z M 0.13476562 6.8574219 L 0.13476562 8.0136719 L 6.453125 8.0136719 L 6.453125 6.8574219 L 0.13476562 6.8574219 z M 1.7011719 8.5410156 L 1.7011719 9.6972656 L 8.0195312 9.6972656 L 8.0195312 8.5410156 L 1.7011719 8.5410156 z M 7.6074219 12 C 8.7378135 12 9.6639385 12.704814 10.003906 13.699219 L 7.6074219 13.699219 L 7.6074219 15.400391 L 10.003906 15.400391 C 9.6639386 16.394794 8.7378135 17.099609 7.6074219 17.099609 C 6.1795587 17.099609 5.0566406 15.976691 5.0566406 14.548828 C 5.0566406 13.120965 6.1795587 12 7.6074219 12 z M 13.53125 12 L 16.105469 12 C 15.731505 12.492953 15.460786 13.06178 15.341797 13.699219 L 14.150391 13.699219 L 13.53125 12 z M 19.513672 12 C 20.941536 12 22.064453 13.120965 22.064453 14.548828 C 22.064453 15.976691 20.933722 17.099609 19.505859 17.099609 C 18.077996 17.099609 16.955078 15.976691 16.955078 14.548828 C 16.955078 13.758404 17.303708 13.078783 17.847656 12.611328 L 18.664062 14.855469 L 20.261719 14.277344 L 19.4375 12.007812 C 19.463 12.007812 19.488182 12 19.513672 12 z",
        viewbox: "0 0 24 24"
      },
      'bus': {
        path: "M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z",
        viewbox: "0 0 24 24"
      }
    }

    var svgElement = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    svgElement.setAttribute('viewBox', icons[icon].viewbox);
    svgElement.setAttribute('height', "24");

    if (icons[icon].path) {
      var iconElement = document.createElementNS("http://www.w3.org/2000/svg", 'path');
      iconElement.setAttribute("d", icons[icon].path);
      iconElement.setAttribute('fill', 'currentColor');
      svgElement.appendChild(iconElement);
    } else if (icons[icon].g) {
      var gElement = document.createElementNS("http://www.w3.org/2000/svg", 'g');
      gElement.innerHTML = icons[icon].g;
      gElement.setAttribute('fill', 'currentColor');
      svgElement.appendChild(gElement);
    }

    element.appendChild(svgElement);
  }
}


export interface RouteDirectionsOptions {
  mode?: TravelMode;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  avoidHighways?: boolean;
  elevation?: boolean;
  units?: "metric" | "imperial";
  waypoints?: Waypoint[];

  lang?: SupportedLanguage;
  noStopover?: boolean;
  supportedModes?: TravelMode[];
  supportedOptions?: RoutingOption[];
  calculateRouteTrigger?: 'auto' | 'buttonClick' | 'functionCall';
  labels?: { [key: string]: string };
  debounceDelay?: number;
}

export type RoutingOption = 'tolls' | 'ferries' | 'highways' | 'units';

export type TravelMode =
  'walk' | 'hike' |
  'scooter' | 'motorcycle' |
  'drive' | 'light_truck' |
  'medium_truck' | 'truck' |
  'bicycle' | 'mountain_bike' | 'road_bike' |
  'bus';

export interface Waypoint {
  address?: string;
  lon?: number;
  lat?: number;
  geocoder?: GeocoderAutocomplete;
}

export type WaypointChangeCallbackType = (waypoint: Waypoint, reason: 'added' | 'removed' | 'changed' | 'moved') => void;
export type ModeChangeCallbackType = (mode: TravelMode) => void;
export type OptionChangeCallbackType = (option: RoutingOption) => void;
export type RouteCalculatedCallbackType = (geojson: any) => void;