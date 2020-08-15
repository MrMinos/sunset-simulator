// scene/demo-specific variables go here
var EPS_intersect;
var sceneIsDynamic = true;
var camFlightSpeed = 300;
var sunAngle = 0;
var sunDirection = new THREE.Vector3();
var waterLevel = 600;
var cameraUnderWater = 0.0;
var sunrise = true;
var sunheight = 0.0;

// called automatically from within initTHREEjs() function
function initSceneData() {
        
        // scene/demo-specific three.js objects setup goes here
        EPS_intersect = mouseControl ? 0.2 : 4.0; // less precision on mobile

        // set camera's field of view
        worldCamera.fov = 60;
        focusDistance = 3000.0;

        // position and orient camera
        cameraControlsObject.position.set(-1837, 1550, 2156);
	cameraControlsYawObject.rotation.y = 5.6;//3.0;
	cameraControlsPitchObject.rotation.x = 0.0;
        
        PerlinNoiseTexture = new THREE.TextureLoader().load( 'lib/textures/perlin256.png' );
        PerlinNoiseTexture.wrapS = THREE.RepeatWrapping;
        PerlinNoiseTexture.wrapT = THREE.RepeatWrapping;
        PerlinNoiseTexture.flipY = false;
        PerlinNoiseTexture.minFilter = THREE.LinearFilter;
        PerlinNoiseTexture.magFilter = THREE.LinearFilter;
        PerlinNoiseTexture.generateMipmaps = false;

} // end function initSceneData()



// called automatically from within initTHREEjs() function
function initPathTracingShaders() {
 
        // scene/demo-specific uniforms go here
        pathTracingUniforms = {
					
                tPreviousTexture: { type: "t", value: screenTextureRenderTarget.texture },	
                t_PerlinNoise: { type: "t", value: PerlinNoiseTexture },
                
                uCameraIsMoving: { type: "b1", value: false },
                
                uEPS_intersect: { type: "f", value: EPS_intersect },
                uCameraUnderWater: { type: "f", value: 0.0 },
                uWaterLevel: { type: "f", value: 0.0 },
                uTime: { type: "f", value: 0.0 },
                uSampleCounter: { type: "f", value: 0.0 },
                uFrameCounter: { type: "f", value: 1.0 },
                uULen: { type: "f", value: 1.0 },
                uVLen: { type: "f", value: 1.0 },
                uApertureSize: { type: "f", value: 0.0 },
                uFocusDistance: { type: "f", value: focusDistance },
                
                uResolution: { type: "v2", value: new THREE.Vector2() },
                
                uRandomVector: { type: "v3", value: new THREE.Vector3() },
                uSunDirection: { type: "v3", value: new THREE.Vector3() },
        
                uCameraMatrix: { type: "m4", value: new THREE.Matrix4() },
                uSunDiameter: { type: "f", value: 0.0001 },
                uNoSun : {type: "b1", value: false }

        };

        pathTracingDefines = {
        	//NUMBER_OF_TRIANGLES: total_number_of_triangles
        };

        // load vertex and fragment shader files that are used in the pathTracing material, mesh and scene
        fileLoader.load('lib/shaders/common_PathTracing_Vertex.glsl', function (shaderText) {
                pathTracingVertexShader = shaderText;

                createPathTracingMaterial();
        });

} // end function initPathTracingShaders()


// called automatically from within initPathTracingShaders() function above
function createPathTracingMaterial() {

        fileLoader.load('src/scene.glsl', function (shaderText) {
                
                pathTracingFragmentShader = shaderText;

                pathTracingMaterial = new THREE.ShaderMaterial({
                        uniforms: pathTracingUniforms,
                        defines: pathTracingDefines,
                        vertexShader: pathTracingVertexShader,
                        fragmentShader: pathTracingFragmentShader,
                        depthTest: false,
                        depthWrite: false
                });

                pathTracingMesh = new THREE.Mesh(pathTracingGeometry, pathTracingMaterial);
                pathTracingScene.add(pathTracingMesh);

                // the following keeps the large scene ShaderMaterial quad right in front 
                //   of the camera at all times. This is necessary because without it, the scene 
                //   quad will fall out of view and get clipped when the camera rotates past 180 degrees.
                worldCamera.add(pathTracingMesh);
                
        });

} // end function createPathTracingMaterial()



// called automatically from within the animate() function
function updateVariablesAndUniforms() {
        
        // scene/demo-specific variables
        if (cameraControlsObject.position.y < 0.0)
                cameraUnderWater = true;
        else cameraUnderWater = false;
        
        // sunAngle = (elapsedTime * 0.03) % (Math.PI * 1.1);
        // sunDirection.set(Math.cos(sunAngle) * 1.2, Math.sin(sunAngle), -Math.cos(sunAngle) * 3.0);
        // sunDirection.normalize();
        
        if ( !cameraIsMoving ) {
                
                if (sceneIsDynamic)
                        sampleCounter = 1.0; // reset for continuous updating of image
                else sampleCounter += 1.0; // for progressive refinement of image
                
                frameCounter += 1.0;

                cameraRecentlyMoving = false;  
        }

        if (cameraIsMoving) {
                sampleCounter = 1.0;
                frameCounter += 1.0;

                if (!cameraRecentlyMoving) {
                        frameCounter = 1.0;
                        cameraRecentlyMoving = true;
                }
        }
        
        // scene/demo-specific uniforms
        if (cameraControlsObject.position.y < waterLevel)
                cameraUnderWater = 1.0;
        else cameraUnderWater = 0.0;

        // console.log(sunDirection.y, sunrise);
        if (sunDirection.z == 0.0) {
                sunDirection.set(0.6, -5, -1.6);
                sunDirection.normalize();
                sunheight = sunDirection.y;
        }
        // else if (sunDirection.y > 0.4 && sunrise) {
        //   sunrise = false;
        // }
        // else if (sunDirection.z < -0.05 && !sunrise) {
        //   sunrise = true;
        // }

        sunAngle = (elapsedTime * 0.03) + Math.PI * 3/2;
        // sunDirection.set(Math.cos(sunAngle) * 1.2, Math.sin(sunAngle), -Math.cos(sunAngle) * 3.0);
        if (sunrise) {
                sunDirection.set(sunDirection.x, Math.sin(sunAngle)/5 + 0.18, sunDirection.z);
                sunDirection.normalize();
        } else {
                // sunAngle = (elapsedTime * 0.01) ;
                sunDirection.set(sunDirection.x, Math.sin(sunAngle)/5 + 0.18, sunDirection.z);
                sunDirection.normalize();
        }
        // if (sunrise) {        
        //         sunAngle = (elapsedTime * 0.01) % Math.PI * 10;
        //         sunDirection.set(0, 0, -Math.cos(sunAngle) * 3.0);
        //         // sunDirection.set(Math.cos(sunAngle) * 1.2, Math.sin(sunAngle), -Math.cos(sunAngle) * 3.0);
        //         sunDirection.normalize();
        // }
        // else {                
        //         sunAngle = (elapsedTime * 0.01) % Math.PI * 10;
        //         sunDirection.set(Math.cos(sunAngle) * 1.2, Math.sin(sunAngle), -Math.sin(sunAngle) * 3.0);
        //         sunDirection.normalize();
        // }
        
        pathTracingUniforms.uCameraUnderWater.value = cameraUnderWater;
        pathTracingUniforms.uWaterLevel.value = waterLevel;
        pathTracingUniforms.uSunDirection.value.copy(sunDirection);
        pathTracingUniforms.uTime.value = elapsedTime;
        pathTracingUniforms.uCameraIsMoving.value = cameraIsMoving;
        pathTracingUniforms.uSampleCounter.value = sampleCounter;
        pathTracingUniforms.uFrameCounter.value = frameCounter;
        pathTracingUniforms.uRandomVector.value.copy(randomVector.set( Math.random(), Math.random(), Math.random() ));
        
        // CAMERA
        cameraControlsObject.updateMatrixWorld(true);			
        pathTracingUniforms.uCameraMatrix.value.copy( worldCamera.matrixWorld );
        screenOutputMaterial.uniforms.uOneOverSampleCounter.value = 1.0 / sampleCounter;
        
        // cameraInfoElement.innerHTML = "FOV: " + worldCamera.fov + " / Aperture: " + apertureSize.toFixed(2) + " / FocusDistance: " + focusDistance + "<br>" + "Samples: " + sampleCounter;
				
} // end function updateUniforms()



init(); // init app and start animating
