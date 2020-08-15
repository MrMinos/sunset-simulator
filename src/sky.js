
THREE.ShaderChunk[ 'pathtracing_physical_sky_functions' ] = `

#define DISTANCE_TO_SUN 100000

float RayleighPhase(float cosTheta)
{
	return THREE_OVER_SIXTEENPI * (1.0 + (cosTheta * cosTheta));
}

float hgPhase(float cosTheta, float g)
{
        float g2 = g * g;
        float inverse = 1.0 / pow(max(0.0, 1.0 - 2.0 * g * cosTheta + g2), 1.5);
	return ONE_OVER_FOURPI * ((1.0 - g2) * inverse);
}

vec3 totalMie()
{
	float c = (0.2 * TURBIDITY) * 10E-18;
	return 0.434 * c * MIE_CONST;
}

float SunIntensity(float zenithAngleCos)
{
	return SUN_POWER * max( 0.0, 1.0 - exp( -( CUTOFF_ANGLE - acos(zenithAngleCos) ) ) );
}

vec3 Get_Sky_Color(Ray r, vec3 sunDirection, bool rayFromCamera, int rgb)
{

    // TODO
    // 1. Wavelength sampling
    // 2. Dynamic refraction
    // 3. Atmospheric refraction (automatic?)

    vec3 viewDir = normalize(r.direction);
	
	/* most of the following code is borrowed from the three.js shader file: SkyShader.js */

    // Cosine angles
	float cosViewSunAngle = dot(viewDir, sunDirection);
	float cosSunUpAngle = dot(sunDirection, UP_VECTOR); // allowed to be negative: + is daytime, - is nighttime
	float cosUpViewAngle = max(0.0001, dot(UP_VECTOR, viewDir)); // cannot be 0, used as divisor

	// Get sun intensity based on how high in the sky it is
	float sunE = SunIntensity(cosSunUpAngle);
        
	// extinction (absorbtion + out scattering)
	// rayleigh coefficients
    vec3 rayleighAtX = TOTAL_RAYLEIGH * RAYLEIGH_COEFFICIENT;
    
	// mie coefficients
	vec3 mieAtX = totalMie() * MIE_COEFFICIENT;  
    
	// optical length
	float zenithAngle = 1.0 / cosUpViewAngle;
    
	float rayleighOpticalLength = RAYLEIGH_ZENITH_LENGTH * zenithAngle;
	float mieOpticalLength = MIE_ZENITH_LENGTH * zenithAngle;

	// combined extinction factor	
	vec3 Fex = exp(-(rayleighAtX * rayleighOpticalLength + mieAtX * mieOpticalLength));

	// in scattering
	vec3 rayleighXtoEye = rayleighAtX * RayleighPhase(cosViewSunAngle);
	vec3 mieXtoEye = mieAtX * hgPhase(cosViewSunAngle, MIE_DIRECTIONAL_G);
	
	vec3 totalLightAtX = rayleighAtX + mieAtX;
	vec3 lightFromXtoEye = rayleighXtoEye + mieXtoEye; 

	vec3 somethingElse = sunE * (lightFromXtoEye / totalLightAtX);

	vec3 sky = somethingElse * (1.0 - Fex);
	float oneMinusCosSun = 1.0 - cosSunUpAngle;
	sky *= mix( vec3(1.0), pow(somethingElse * Fex,vec3(0.5)), 
	clamp(oneMinusCosSun * oneMinusCosSun * oneMinusCosSun * oneMinusCosSun * oneMinusCosSun, 0.0, 1.0) );

	vec3 sun;
	float sundisk = smoothstep(SUN_ANGULAR_DIAMETER_COS - (uSunDiameter < 0.0 ? 0.0 : uSunDiameter), SUN_ANGULAR_DIAMETER_COS, cosViewSunAngle);

	// composition + solar disk
	if (!rayFromCamera) {
		sun = (sunE * SUN_POWER * Fex) * sundisk;
	}
	// Sun wavelength samples
	else {

		// ray r intersects with a boundary surface plane

		// at the intersection, find the exit angle and check for intersection with sun
		// do it in the shader??

		// 
		vec3 color;

		if (rgb == 0)
			color = vec3(exp(-(TOTAL_RAYLEIGH.x * RAYLEIGH_COEFFICIENT * rayleighOpticalLength)),0,0);
		else if (rgb == 1)
			color = vec3(0, exp(-(TOTAL_RAYLEIGH.y * RAYLEIGH_COEFFICIENT * rayleighOpticalLength)), 0);
		else
			color = vec3(0, 0, exp(-(TOTAL_RAYLEIGH.z * RAYLEIGH_COEFFICIENT * rayleighOpticalLength)));

		//sun = (sunE * SUN_POWER * vec3 (r, g, b)) * sundisk;
		sun = color * sunE * SUN_POWER * sundisk;
	}

	
	// TODO: animation pause

	if (uNoSun)
		return sky;
	else
		return sky + sun;
}

`;