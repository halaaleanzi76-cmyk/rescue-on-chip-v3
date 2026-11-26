import{c as R,r as p,O as Ne,y as t,I as H,M as qe,L as Ve,z as F,n as P,w as ye}from"./index-CNaE-CCO.js";import{R as ft,L as pt,c as ht,X as xt,Y as gt,T as yt,d as Ce,e as bt,P as vt}from"./workbench-C2iWaa3H.js";import{R as jt,I as wt,F as ke,a as pe,b as q,c as _t,B as be,S as Xe,V as N,d as St,U as Pe,e as Oe,f as Ye,M as Mt,g as V,L as Et,h as At,i as Lt,u as ve,C as Nt,_ as he,E as Ct,D as ne,j as kt,T as Pt,k as Ke,l as Ot,m as Ue,n as Ut,P as Bt,O as Tt,o as Dt,p as zt,q as Rt,W as Gt}from"./OrbitControls-DEGUqQ39.js";import{R as Je}from"./engine-text-DIj4LETr.js";const It=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["line",{x1:"22",x2:"18",y1:"12",y2:"12",key:"l9bcsi"}],["line",{x1:"6",x2:"2",y1:"12",y2:"12",key:"13hhkx"}],["line",{x1:"12",x2:"12",y1:"6",y2:"2",key:"10w3f3"}],["line",{x1:"12",x2:"12",y1:"22",y2:"18",key:"15g9kq"}]],Wt=R("crosshair",It);const Ht=[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]],Ft=R("eye",Ht);const $t=[["path",{d:"m12 14 4-4",key:"9kzdfg"}],["path",{d:"M3.34 19a10 10 0 1 1 17.32 0",key:"19p75a"}]],qt=R("gauge",$t);const Vt=[["path",{d:"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z",key:"zw3jo"}],["path",{d:"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12",key:"1wduqc"}],["path",{d:"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17",key:"kqbvx6"}]],Ps=R("layers",Vt);const Xt=[["rect",{x:"14",y:"3",width:"5",height:"18",rx:"1",key:"kaeet6"}],["rect",{x:"5",y:"3",width:"5",height:"18",rx:"1",key:"1wsw3u"}]],Yt=R("pause",Xt);const Kt=[["circle",{cx:"6",cy:"6",r:"3",key:"1lh9wr"}],["path",{d:"M8.12 8.12 12 12",key:"1alkpv"}],["path",{d:"M20 4 8.12 15.88",key:"xgtan2"}],["circle",{cx:"6",cy:"18",r:"3",key:"fqmcym"}],["path",{d:"M14.8 14.8 20 20",key:"ptml3r"}]],Jt=R("scissors",Kt);const Zt=[["path",{d:"M21 4v16",key:"7j8fe9"}],["path",{d:"M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z",key:"zs4d6"}]],Qt=R("skip-forward",Zt);const es=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],Ze=R("sparkles",es);const ts=[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]],ss=R("tag",ts),ns=[.25,.5,1,2,4];class Os{t=0;tMin=0;tMax=1;playing=!1;speed=1;ls=new Set;subscribe(e){return this.ls.add(e),()=>{this.ls.delete(e)}}emit(e){this.ls.forEach(n=>n(e))}setRange(e,n,i){this.tMin=e,this.tMax=Math.max(n,e+1e-6),this.t=i?Math.min(this.tMax,Math.max(this.tMin,this.t)):e,this.emit("control")}play(){this.t>=this.tMax&&(this.t=this.tMin),this.playing=!0,this.emit("control")}pause(){this.playing=!1,this.emit("control")}toggle(){this.playing?this.pause():this.play()}restart(){this.t=this.tMin,this.emit("control")}seek(e){this.t=Math.min(this.tMax,Math.max(this.tMin,e)),this.emit("control")}setSpeed(e){this.speed=e,this.emit("control")}advance(e){this.playing&&(this.t+=e*this.speed,this.t>=this.tMax?(this.t=this.tMax,this.playing=!1,this.emit("control")):this.emit("tick"))}}function Us(s){p.useEffect(()=>{let e=0,n=performance.now();const i=r=>{const a=Math.max(0,(r-n)/1e3);n=r,document.hidden||s.advance(a),e=requestAnimationFrame(i)};return e=requestAnimationFrame(i),()=>cancelAnimationFrame(e)},[s])}const oe=s=>({t:s.t,playing:s.playing,speed:s.speed,tMin:s.tMin,tMax:s.tMax});function rs(s,e=100){const[n,i]=p.useState(()=>oe(s));return p.useEffect(()=>{let r=0;return i(oe(s)),s.subscribe(a=>{const l=performance.now();(a==="control"||l-r>=e)&&(r=l,i(oe(s)))})},[s,e]),n}const T=6,as=16,xe=.3;function is(s){return .045+.075*Math.min(1,s/100)}function Qe(s){return Math.max(1,Math.min(as,Math.round(s||1)))}function Bs(s){const e={};if(!s)return e;for(const n of s.frames)(e[n.method]??={method:n.method,frames:[],times:[]}).frames.push(n);for(const n of Object.keys(e))e[n].frames.sort((i,r)=>i.time_s-r.time_s),e[n].times=e[n].frames.map(i=>i.time_s);return e}function Ts(s){return Object.keys(s).sort((e,n)=>Ne.indexOf(e)-Ne.indexOf(n))}function Ds(s){if(!s||s.frames.length===0)return[0,1];let e=1/0,n=-1/0;for(const i of s.frames)i.time_s<e&&(e=i.time_s),i.time_s>n&&(n=i.time_s);return[e,n]}const A=(s,e,n)=>s+(e-s)*n;function Be(s,e,n){const i=Math.min(s.length,e.length),r=new Array(i);for(let a=0;a<i;a++)r[a]=A(s[a],e[a],n);return r}function os(s,e){if(!s||s.frames.length===0)return null;const{frames:n,times:i}=s;let r=0,a=0,l=0;if(e<=i[0])r=a=0;else if(e>=i[i.length-1])r=a=i.length-1;else{let c=0,d=i.length-1;for(;d-c>1;){const f=c+d>>1;i[f]<=e?c=f:d=f}r=c,a=d;const m=i[d]-i[c];l=m>0?(e-i[c])/m:0}const o=n[r],u=n[a];return{time_s:e,pressure_pa:A(o.pressure_pa,u.pressure_pa,l),flow_ul_min:A(o.flow_ul_min,u.flow_ul_min,l),mean_velocity_mm_s:A(o.mean_velocity_mm_s,u.mean_velocity_mm_s,l),centerline_velocity_mm_s:A(o.centerline_velocity_mm_s,u.centerline_velocity_mm_s,l),viscosity_mpas:A(o.viscosity_mpas,u.viscosity_mpas,l),wall_shear_pa:A(o.wall_shear_pa,u.wall_shear_pa,l),carryover_pct:A(o.carryover_pct,u.carryover_pct,l),displacement_mm:A(o.displacement_mm,u.displacement_mm,l),axial:Be(o.axial_pressure_pa,u.axial_pressure_pa,l),radial:Be(o.radial_velocity_mm_s,u.radial_velocity_mm_s,l)}}function Te(s,e){if(s.length===0)return 0;const n=Math.max(0,Math.min(1,e))*(s.length-1),i=Math.floor(n),r=Math.min(s.length-1,i+1);return A(s[i],s[r],n-i)}function ls(s,e,n){if(!s.length)return 0;if(n<=s[0])return e[0];for(let i=1;i<s.length;i++)if(n<=s[i])return A(e[i-1],e[i],(n-s[i-1])/(s[i]-s[i-1]||1));return e[e.length-1]}const re=s=>[parseInt(s.slice(1,3),16)/255,parseInt(s.slice(3,5),16)/255,parseInt(s.slice(5,7),16)/255],et=["#102a43","#145c7a","#1f9aa0","#7fd1a7","#f1dc7a","#f39a4f","#d9452f"],tt=["#2c6fd6","#59a8e8","#a9d6ee","#dfe7ea","#f6cf7c","#f08c4a","#d63b2a"],cs=et.map(re),ds=tt.map(re);function st(s,e){const n=Math.max(0,Math.min(1,Number.isFinite(e)?e:0))*(s.length-1),i=Math.min(s.length-2,Math.floor(n)),r=n-i;return[A(s[i][0],s[i+1][0],r),A(s[i][1],s[i+1][1],r),A(s[i][2],s[i+1][2],r)]}function De(s,e){return st(cs,(s-e.pMin)/(e.pMax-e.pMin||1))}function ze(s,e){return st(ds,.5+.5*s/(e.vMax||1))}const us=re("#3a6f7c"),Re=re("#5d8592"),ms=s=>`linear-gradient(90deg, ${s.join(", ")})`;function zs(...s){const e=s.filter(Boolean);return e.length?{pMin:Math.min(...e.map(n=>n.pressure_min_pa)),pMax:Math.max(...e.map(n=>n.pressure_max_pa)),vMax:Math.max(...e.map(n=>n.velocity_abs_max_mm_s))||1}:{pMin:0,pMax:1,vMax:1}}function le(s,e){let n=1,i=0,r=s+1;for(;r>0;)n/=e,i+=n*(r%e),r=Math.floor(r/e);return i}const Ge={fontSize:10,fontFamily:"Geist Mono, monospace",fill:"hsl(198 14% 58%)"};function Rs({series:s,field:e,unit:n,t:i,height:r=120,switchS:a,testId:l,active:o}){const u=p.useMemo(()=>{const c=new Map;for(const d of s)for(const m of d.mf.frames){const f=c.get(m.time_s)??{time_s:m.time_s};f[d.id]=m[e],c.set(m.time_s,f)}return Array.from(c.values()).sort((d,m)=>d.time_s-m.time_s)},[s,e]);return t.jsx("div",{style:{height:r},"data-testid":l,children:t.jsx(ft,{children:t.jsxs(pt,{data:u,margin:{top:6,right:8,left:0,bottom:0},children:[t.jsx(ht,{stroke:"hsl(200 22% 15%)",strokeDasharray:"2 4"}),t.jsx(xt,{dataKey:"time_s",type:"number",domain:["dataMin","dataMax"],tick:Ge,tickCount:5,height:18}),t.jsx(gt,{tick:Ge,width:44,domain:["auto","auto"],tickFormatter:c=>H(Number(c),1)}),t.jsx(yt,{contentStyle:{background:"hsl(205 30% 10%)",border:"1px solid hsl(200 22% 22%)",fontSize:11,fontFamily:"Geist Mono, monospace"},labelFormatter:c=>`t = ${H(Number(c),2)} s`,formatter:(c,d)=>[`${H(Number(c),3)} ${n}`,String(d)]}),a!==void 0&&t.jsx(Ce,{x:a,stroke:"#ef7a5a",strokeDasharray:"3 3"}),s.map(c=>t.jsx(bt,{dataKey:c.id,name:c.label??Ve[c.mf.method]??c.id,stroke:c.color??qe[c.mf.method]??"#8ab",dot:!1,strokeWidth:o&&o!==c.id?1:1.8,strokeOpacity:o&&o!==c.id?.4:1,strokeDasharray:c.dashed?"4 3":void 0,isAnimationActive:!1,connectNulls:!0},c.id)),t.jsx(Ce,{x:i,stroke:"#e8f6f8",strokeWidth:1.2})]})})})}const nt=parseInt(jt.replace(/\D+/g,"")),rt=nt>=125?"uv1":"uv2",Ie=new be,ee=new N;class je extends wt{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],n=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],i=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(i),this.setAttribute("position",new ke(e,3)),this.setAttribute("uv",new ke(n,2))}applyMatrix4(e){const n=this.attributes.instanceStart,i=this.attributes.instanceEnd;return n!==void 0&&(n.applyMatrix4(e),i.applyMatrix4(e),n.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let n;e instanceof Float32Array?n=e:Array.isArray(e)&&(n=new Float32Array(e));const i=new pe(n,6,1);return this.setAttribute("instanceStart",new q(i,3,0)),this.setAttribute("instanceEnd",new q(i,3,3)),this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e,n=3){let i;e instanceof Float32Array?i=e:Array.isArray(e)&&(i=new Float32Array(e));const r=new pe(i,n*2,1);return this.setAttribute("instanceColorStart",new q(r,n,0)),this.setAttribute("instanceColorEnd",new q(r,n,n)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new _t(e.geometry)),this}fromLineSegments(e){const n=e.geometry;return this.setPositions(n.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new be);const e=this.attributes.instanceStart,n=this.attributes.instanceEnd;e!==void 0&&n!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Ie.setFromBufferAttribute(n),this.boundingBox.union(Ie))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Xe),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,n=this.attributes.instanceEnd;if(e!==void 0&&n!==void 0){const i=this.boundingSphere.center;this.boundingBox.getCenter(i);let r=0;for(let a=0,l=e.count;a<l;a++)ee.fromBufferAttribute(e,a),r=Math.max(r,i.distanceToSquared(ee)),ee.fromBufferAttribute(n,a),r=Math.max(r,i.distanceToSquared(ee));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}}class at extends je{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const n=e.length-3,i=new Float32Array(2*n);for(let r=0;r<n;r+=3)i[2*r]=e[r],i[2*r+1]=e[r+1],i[2*r+2]=e[r+2],i[2*r+3]=e[r+3],i[2*r+4]=e[r+4],i[2*r+5]=e[r+5];return super.setPositions(i),this}setColors(e,n=3){const i=e.length-n,r=new Float32Array(2*i);if(n===3)for(let a=0;a<i;a+=n)r[2*a]=e[a],r[2*a+1]=e[a+1],r[2*a+2]=e[a+2],r[2*a+3]=e[a+3],r[2*a+4]=e[a+4],r[2*a+5]=e[a+5];else for(let a=0;a<i;a+=n)r[2*a]=e[a],r[2*a+1]=e[a+1],r[2*a+2]=e[a+2],r[2*a+3]=e[a+3],r[2*a+4]=e[a+4],r[2*a+5]=e[a+5],r[2*a+6]=e[a+6],r[2*a+7]=e[a+7];return super.setColors(r,n),this}fromLine(e){const n=e.geometry;return this.setPositions(n.attributes.position.array),this}}class we extends St{constructor(e){super({type:"LineMaterial",uniforms:Pe.clone(Pe.merge([Oe.common,Oe.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Ye(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${nt>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(n){this.uniforms.diffuse.value=n}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(n){n===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(n){this.uniforms.linewidth.value=n}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(n){!!n!="USE_DASH"in this.defines&&(this.needsUpdate=!0),n===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(n){this.uniforms.dashScale.value=n}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(n){this.uniforms.dashSize.value=n}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(n){this.uniforms.dashOffset.value=n}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(n){this.uniforms.gapSize.value=n}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(n){this.uniforms.opacity.value=n}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(n){this.uniforms.resolution.value.copy(n)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(n){!!n!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),n===!0?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}const ce=new V,We=new N,He=new N,w=new V,_=new V,U=new V,de=new N,ue=new At,S=new Et,Fe=new N,te=new be,se=new Xe,B=new V;let D,$;function $e(s,e,n){return B.set(0,0,-e,1).applyMatrix4(s.projectionMatrix),B.multiplyScalar(1/B.w),B.x=$/n.width,B.y=$/n.height,B.applyMatrix4(s.projectionMatrixInverse),B.multiplyScalar(1/B.w),Math.abs(Math.max(B.x,B.y))}function fs(s,e){const n=s.matrixWorld,i=s.geometry,r=i.attributes.instanceStart,a=i.attributes.instanceEnd,l=Math.min(i.instanceCount,r.count);for(let o=0,u=l;o<u;o++){S.start.fromBufferAttribute(r,o),S.end.fromBufferAttribute(a,o),S.applyMatrix4(n);const c=new N,d=new N;D.distanceSqToSegment(S.start,S.end,d,c),d.distanceTo(c)<$*.5&&e.push({point:d,pointOnLine:c,distance:D.origin.distanceTo(d),object:s,face:null,faceIndex:o,uv:null,[rt]:null})}}function ps(s,e,n){const i=e.projectionMatrix,a=s.material.resolution,l=s.matrixWorld,o=s.geometry,u=o.attributes.instanceStart,c=o.attributes.instanceEnd,d=Math.min(o.instanceCount,u.count),m=-e.near;D.at(1,U),U.w=1,U.applyMatrix4(e.matrixWorldInverse),U.applyMatrix4(i),U.multiplyScalar(1/U.w),U.x*=a.x/2,U.y*=a.y/2,U.z=0,de.copy(U),ue.multiplyMatrices(e.matrixWorldInverse,l);for(let f=0,y=d;f<y;f++){if(w.fromBufferAttribute(u,f),_.fromBufferAttribute(c,f),w.w=1,_.w=1,w.applyMatrix4(ue),_.applyMatrix4(ue),w.z>m&&_.z>m)continue;if(w.z>m){const x=w.z-_.z,j=(w.z-m)/x;w.lerp(_,j)}else if(_.z>m){const x=_.z-w.z,j=(_.z-m)/x;_.lerp(w,j)}w.applyMatrix4(i),_.applyMatrix4(i),w.multiplyScalar(1/w.w),_.multiplyScalar(1/_.w),w.x*=a.x/2,w.y*=a.y/2,_.x*=a.x/2,_.y*=a.y/2,S.start.copy(w),S.start.z=0,S.end.copy(_),S.end.z=0;const O=S.closestPointToPointParameter(de,!0);S.at(O,Fe);const k=Lt.lerp(w.z,_.z,O),C=k>=-1&&k<=1,G=de.distanceTo(Fe)<$*.5;if(C&&G){S.start.fromBufferAttribute(u,f),S.end.fromBufferAttribute(c,f),S.start.applyMatrix4(l),S.end.applyMatrix4(l);const x=new N,j=new N;D.distanceSqToSegment(S.start,S.end,j,x),n.push({point:j,pointOnLine:x,distance:D.origin.distanceTo(j),object:s,face:null,faceIndex:f,uv:null,[rt]:null})}}}class it extends Mt{constructor(e=new je,n=new we({color:Math.random()*16777215})){super(e,n),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,n=e.attributes.instanceStart,i=e.attributes.instanceEnd,r=new Float32Array(2*n.count);for(let l=0,o=0,u=n.count;l<u;l++,o+=2)We.fromBufferAttribute(n,l),He.fromBufferAttribute(i,l),r[o]=o===0?0:r[o-1],r[o+1]=r[o]+We.distanceTo(He);const a=new pe(r,2,1);return e.setAttribute("instanceDistanceStart",new q(a,1,0)),e.setAttribute("instanceDistanceEnd",new q(a,1,1)),this}raycast(e,n){const i=this.material.worldUnits,r=e.camera;r===null&&!i&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const a=e.params.Line2!==void 0&&e.params.Line2.threshold||0;D=e.ray;const l=this.matrixWorld,o=this.geometry,u=this.material;$=u.linewidth+a,o.boundingSphere===null&&o.computeBoundingSphere(),se.copy(o.boundingSphere).applyMatrix4(l);let c;if(i)c=$*.5;else{const m=Math.max(r.near,se.distanceToPoint(D.origin));c=$e(r,m,u.resolution)}if(se.radius+=c,D.intersectsSphere(se)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),te.copy(o.boundingBox).applyMatrix4(l);let d;if(i)d=$*.5;else{const m=Math.max(r.near,te.distanceToPoint(D.origin));d=$e(r,m,u.resolution)}te.expandByScalar(d),D.intersectsBox(te)!==!1&&(i?fs(this,n):ps(this,r,n))}onBeforeRender(e){const n=this.material.uniforms;n&&n.resolution&&(e.getViewport(ce),this.material.uniforms.resolution.value.set(ce.z,ce.w))}}class hs extends it{constructor(e=new at,n=new we({color:Math.random()*16777215})){super(e,n),this.isLine2=!0,this.type="Line2"}}const xs=p.forwardRef(function({points:e,color:n=16777215,vertexColors:i,linewidth:r,lineWidth:a,segments:l,dashed:o,...u},c){var d,m;const f=ve(C=>C.size),y=p.useMemo(()=>l?new it:new hs,[l]),[h]=p.useState(()=>new we),O=(i==null||(d=i[0])==null?void 0:d.length)===4?4:3,k=p.useMemo(()=>{const C=l?new je:new at,G=e.map(x=>{const j=Array.isArray(x);return x instanceof N||x instanceof V?[x.x,x.y,x.z]:x instanceof Ye?[x.x,x.y,0]:j&&x.length===3?[x[0],x[1],x[2]]:j&&x.length===2?[x[0],x[1],0]:x});if(C.setPositions(G.flat()),i){n=16777215;const x=i.map(j=>j instanceof Nt?j.toArray():j);C.setColors(x.flat(),O)}return C},[e,l,i,O]);return p.useLayoutEffect(()=>{y.computeLineDistances()},[e,y]),p.useLayoutEffect(()=>{o?h.defines.USE_DASH="":delete h.defines.USE_DASH,h.needsUpdate=!0},[o,h]),p.useEffect(()=>()=>{k.dispose(),h.dispose()},[k]),p.createElement("primitive",he({object:y,ref:c},u),p.createElement("primitive",{object:k,attach:"geometry"}),p.createElement("primitive",he({object:h,attach:"material",color:n,vertexColors:!!i,resolution:[f.width,f.height],linewidth:(m=r??a)!==null&&m!==void 0?m:1,dashed:o,transparent:O===4},u)))}),gs=p.forwardRef(({threshold:s=15,geometry:e,...n},i)=>{const r=p.useRef(null);p.useImperativeHandle(i,()=>r.current,[]);const a=p.useMemo(()=>[0,0,0,1,0,0],[]),l=p.useRef(null),o=p.useRef(null);return p.useLayoutEffect(()=>{const u=r.current.parent,c=e??u?.geometry;if(!c||l.current===c&&o.current===s)return;l.current=c,o.current=s;const m=new Ct(c,s).attributes.position.array;r.current.geometry.setPositions(m),r.current.geometry.attributes.instanceStart.needsUpdate=!0,r.current.geometry.attributes.instanceEnd.needsUpdate=!0,r.current.computeLineDistances()}),p.createElement(xs,he({segments:!0,points:a,ref:r,raycast:()=>null},n))});function ys({position:s,text:e,className:n}){const i=p.useRef(null),r=p.useRef(null),a=p.useMemo(()=>new N,[]),{gl:l,camera:o,size:u}=ve();return p.useEffect(()=>{const c=document.createElement("div");return Object.assign(c.style,{position:"absolute",left:"0",top:"0",pointerEvents:"none",zIndex:"4"}),l.domElement.parentElement?.appendChild(c),r.current=c,()=>{r.current=null,c.remove()}},[l]),p.useEffect(()=>{r.current&&(r.current.textContent=e,r.current.className=n)},[e,n]),Ke(()=>{!i.current||!r.current||(i.current.getWorldPosition(a),a.project(o),r.current.style.display=a.z>1||a.z<-1?"none":"",r.current.style.transform=`translate3d(${(a.x+1)*u.width/2}px,${(1-a.y)*u.height/2}px,0) translate(-50%,-50%)`)}),t.jsx("group",{ref:i,position:s})}function Y({points:s,radius:e=.05,color:n="#7fb8c2",opacity:i=.55,hot:r=!1}){const a=p.useMemo(()=>{const l=new kt(s.map(o=>new N(...o)),!1,"catmullrom",.1);return new Pt(l,Math.max(24,s.length*12),e,10,!1)},[s,e]);return t.jsx("mesh",{geometry:a,children:t.jsx("meshStandardMaterial",{color:n,transparent:!0,opacity:i,roughness:.25,metalness:.1,emissive:r?"#3fc1c9":"#000000",emissiveIntensity:r?.5:0,depthWrite:!1})})}function K({hot:s,opacity:e=.16,color:n="#bfe9ee"}){return t.jsx("meshStandardMaterial",{color:n,transparent:!0,opacity:e,roughness:.08,metalness:.05,emissive:s?"#3fc1c9":"#000000",emissiveIntensity:s?.35:0,depthWrite:!1,side:ne})}function W({color:s,hot:e,metal:n=.6,rough:i=.35}){return t.jsx("meshStandardMaterial",{color:s,metalness:n,roughness:i,emissive:e?"#3fc1c9":"#000000",emissiveIntensity:e?.45:0})}function z({id:s,selected:e,onSelect:n,label:i,labelPos:r,concept:a,showLabels:l,children:o}){return t.jsxs("group",{onClick:u=>{u.stopPropagation(),n(s)},onPointerOver:u=>{u.stopPropagation(),document.body.style.cursor="pointer"},onPointerOut:()=>{document.body.style.cursor=""},children:[o,l&&t.jsx(ys,{position:r,text:i,className:F("lab-label",a&&"concept",e===s&&"sel")})]})}function bs({width:s,selected:e,onSelect:n,showLabels:i}){const r=T/2,a=s+1,l={selected:e,onSelect:n,showLabels:i},o=f=>e===f,u=[-8.2,.9,-1.3],c=[-8.2,.9,1.3],d=[-6.2,.15,0],m=[-4.8,.35,0];return t.jsxs("group",{children:[t.jsxs(z,{id:"chip",label:P("sc.chip"),labelPos:[0,.55,-a/2],concept:!0,...l,children:[t.jsxs("mesh",{position:[0,0,0],children:[t.jsx("boxGeometry",{args:[T+1.3,.38,a]}),t.jsx(K,{hot:o("chip"),opacity:.09}),t.jsx(gs,{color:o("chip")?"#7ff0f5":"#3a8c96",threshold:15})]}),t.jsxs("mesh",{position:[0,-.215,0],children:[t.jsx("boxGeometry",{args:[T+1.5,.05,a+.2]}),t.jsx("meshStandardMaterial",{color:"#14303a",transparent:!0,opacity:.85,roughness:.6})]}),[-1,1].map(f=>t.jsxs("mesh",{position:[f*(r+.3),0,0],children:[t.jsx("boxGeometry",{args:[.22,.16,Math.max(.3,s+.4)]}),t.jsx(K,{hot:o("chip"),opacity:.22,color:"#9fd8de"})]},f))]}),t.jsx(z,{id:"barrier",label:P("sc.barrier"),labelPos:[r-.4,-.35,a/2],concept:!0,...l,children:t.jsxs("mesh",{position:[0,-.14,0],rotation:[-Math.PI/2,0,0],children:[t.jsx("planeGeometry",{args:[T,Math.max(.3,s+.4)]}),t.jsx("meshStandardMaterial",{color:"#d98a8a",transparent:!0,opacity:o("barrier")?.4:.16,side:2,depthWrite:!1})]})}),[["reservoir-a",u,"#3fc1c9",P("sc.reservoirA")],["reservoir-b",c,"#e8b04a",P("sc.reservoirB")]].map(([f,y,h,O])=>t.jsxs(z,{id:f,label:O,labelPos:[y[0],y[1]+1.15,y[2]],concept:!0,...l,children:[t.jsxs("group",{position:y,children:[t.jsxs("mesh",{children:[t.jsx("cylinderGeometry",{args:[.5,.5,1.6,32,1,!0]}),t.jsx(K,{hot:o(f),opacity:.2})]}),t.jsxs("mesh",{position:[0,-.2,0],children:[t.jsx("cylinderGeometry",{args:[.46,.46,1.1,32]}),t.jsx("meshStandardMaterial",{color:h,transparent:!0,opacity:.55,roughness:.2})]}),t.jsxs("mesh",{position:[0,.84,0],children:[t.jsx("cylinderGeometry",{args:[.54,.54,.1,32]}),t.jsx(W,{color:"#2a4652",hot:o(f)})]}),t.jsxs("mesh",{position:[0,-.84,0],children:[t.jsx("cylinderGeometry",{args:[.56,.56,.08,32]}),t.jsx(W,{color:"#1d3540"})]})]}),t.jsx(Y,{points:[[y[0],y[1]-.85,y[2]],[y[0]+.6,.15,y[2]],[d[0]-.3,d[1],y[2]*.2]],radius:.045,color:h,opacity:.6,hot:o(f)})]},f)),t.jsx(z,{id:"manifold",label:P("sc.manifold"),labelPos:[d[0],d[1]+.75,d[2]],concept:!0,...l,children:t.jsxs("group",{position:d,children:[t.jsxs("mesh",{children:[t.jsx("boxGeometry",{args:[.7,.36,1]}),t.jsx(W,{color:"#24434f",hot:o("manifold"),metal:.7,rough:.3})]}),[-.25,.25].map(f=>t.jsxs("group",{position:[0,.3,f],children:[t.jsxs("mesh",{children:[t.jsx("cylinderGeometry",{args:[.09,.09,.25,16]}),t.jsx(W,{color:"#8fb3bd"})]}),t.jsxs("mesh",{position:[0,.15,0],rotation:[0,f>0?.6:-.6,0],children:[t.jsx("boxGeometry",{args:[.34,.04,.06]}),t.jsx(W,{color:f>0?"#e8b04a":"#3fc1c9",metal:.2})]})]},f))]})}),t.jsx(z,{id:"bypass",label:P("sc.bypass"),labelPos:[-1,.3,-a/2-1.1],concept:!0,...l,children:t.jsx(Y,{points:[[d[0],d[1],-.45],[d[0]+.4,.1,-a/2-.9],[0,.1,-a/2-1.1],[r+1.9,.1,-a/2-.6],[r+2.6,.2,-.4]],radius:.04,color:"#6d8b95",opacity:.5,hot:o("bypass")})}),t.jsxs(z,{id:"bubble-trap",label:P("sc.bubbleTrap"),labelPos:[m[0],m[1]+.95,m[2]],concept:!0,...l,children:[t.jsxs("group",{position:m,children:[t.jsxs("mesh",{children:[t.jsx("capsuleGeometry",{args:[.2,.55,8,20]}),t.jsx(K,{hot:o("bubble-trap"),opacity:.24})]}),t.jsxs("mesh",{position:[0,-.12,0],children:[t.jsx("cylinderGeometry",{args:[.17,.17,.4,20]}),t.jsx("meshStandardMaterial",{color:"#3fc1c9",transparent:!0,opacity:.45})]}),[.18,.3,.38].map((f,y)=>t.jsxs("mesh",{position:[.04*(y-1),f,.03*y],children:[t.jsx("sphereGeometry",{args:[.035-y*.006,10,10]}),t.jsx("meshStandardMaterial",{color:"#e8f6f8",transparent:!0,opacity:.7})]},y))]}),t.jsx(Y,{points:[[d[0]+.35,d[1],0],[m[0]-.2,.05,0],[m[0],m[1]-.45,0]],radius:.045}),t.jsx(Y,{points:[[m[0],m[1]-.45,.02],[m[0]+.5,0,0],[-r-.45,0,0]],radius:.045})]}),[["tap-in",-r-.75,P("sc.tapIn")],["tap-out",r+.75,P("sc.tapOut")]].map(([f,y,h])=>t.jsx(z,{id:f,label:h,labelPos:[y,1.05,0],...l,children:t.jsxs("group",{position:[y,0,0],children:[t.jsxs("mesh",{position:[0,.25,0],children:[t.jsx("cylinderGeometry",{args:[.04,.04,.5,12]}),t.jsx(W,{color:"#9fb9c1",hot:o(f)})]}),t.jsxs("mesh",{position:[0,.6,0],rotation:[Math.PI/2,0,0],children:[t.jsx("cylinderGeometry",{args:[.17,.17,.07,28]}),t.jsx(W,{color:"#1c3a45",hot:o(f)})]}),t.jsxs("mesh",{position:[0,.6,.037],children:[t.jsx("circleGeometry",{args:[.14,28]}),t.jsx("meshStandardMaterial",{color:"#d8eef1",emissive:"#3fc1c9",emissiveIntensity:.15})]})]})},f)),t.jsxs(z,{id:"outlet",label:P("sc.outlet"),labelPos:[r+2.7,1.2,0],concept:!0,...l,children:[t.jsx(Y,{points:[[r+.45,0,0],[r+1.6,0,0],[r+2.4,.2,0],[r+2.7,.55,0]],radius:.045,hot:o("outlet")}),t.jsxs("group",{position:[r+2.7,.35,0],children:[t.jsxs("mesh",{children:[t.jsx("cylinderGeometry",{args:[.4,.34,.9,28,1,!0]}),t.jsx(K,{hot:o("outlet"),opacity:.2})]}),t.jsxs("mesh",{position:[0,-.22,0],children:[t.jsx("cylinderGeometry",{args:[.36,.34,.42,28]}),t.jsx("meshStandardMaterial",{color:"#7a9aa3",transparent:!0,opacity:.35})]})]})]})]})}const me=14;function vs(s){const{vis:e,mf:n,pb:i,scale:r,mode:a,opacity:l,crossOn:o,crossPos:u,nDisp:c,nTotal:d,rv:m,showTracers:f,selected:y,onSelect:h,showLabels:O}=s,k=T/2,C=p.useMemo(()=>Array.from({length:c},(g,b)=>(b-(c-1)/2)*xe),[c]),G=p.useMemo(()=>{const g=new Ot(m,m,T,18,24,!0);g.rotateZ(Math.PI/2);const b=g.attributes.position,v=new Float32Array(b.count);for(let E=0;E<b.count;E++)v[E]=(b.getX(E)+k)/T;return g.setAttribute("color",new Ue(new Float32Array(b.count*3),3)),{g,frac:v}},[m,k]),x=p.useMemo(()=>{const g=new Ut(0,m,28,16),b=g.attributes.position,v=new Float32Array(b.count);for(let E=0;E<b.count;E++)v[E]=Math.min(1,Math.hypot(b.getX(E),b.getY(E))/m);return g.rotateY(Math.PI/2),g.setAttribute("color",new Ue(new Float32Array(b.count*3),3)),{g,rho:v}},[m]),j=p.useMemo(()=>new Bt(new N(-1,0,0),1e3),[]),_e=p.useMemo(()=>[j],[j]),X=p.useMemo(()=>{const g=c*me,b=new Float32Array(g*4);for(let v=0;v<g;v++)b[v*4]=le(v,2),b[v*4+1]=Math.sqrt(le(v,3))*.86,b[v*4+2]=le(v,5)*Math.PI*2,b[v*4+3]=Math.floor(v/me);return b},[c]),Se=p.useRef(null),J=p.useRef(null),Z=p.useMemo(()=>new Tt,[]),ot=e?.geometry.length_mm??1;Ke(()=>{const g=os(n,i.t),b=-k+u*T;j.constant=o?b:1e3;const v=G.g.attributes.color,E=v.array;for(let M=0;M<G.frac.length;M++){let L=Re;g&&(a==="pressure"?L=De(Te(g.axial,G.frac[M]),r):a==="velocity"?L=ze(g.mean_velocity_mm_s,r):L=us),E[M*3]=L[0],E[M*3+1]=L[1],E[M*3+2]=L[2]}v.needsUpdate=!0;const Ee=x.g.attributes.color,ae=Ee.array,lt=g?Te(g.axial,u):0;for(let M=0;M<x.rho.length;M++){let L=Re;g&&e&&(L=a==="pressure"?De(lt,r):ze(ls(e.radial_fractions,g.radial,x.rho[M]),r)),ae[M*3]=L[0],ae[M*3+1]=L[1],ae[M*3+2]=L[2]}Ee.needsUpdate=!0,J.current&&(J.current.position.x=b,J.current.visible=o);const ie=Se.current;if(ie){const M=g?g.displacement_mm/ot:0,L=X.length/4;for(let I=0;I<L;I++){const ct=X[I*4],Q=X[I*4+1],Ae=X[I*4+2],dt=X[I*4+3],ut=((ct+M*2*(1-Q*Q))%1+1)%1,Le=-k+ut*T;Z.position.set(Le,Math.cos(Ae)*Q*m,C[dt]+Math.sin(Ae)*Q*m);const mt=!f||!g||o&&Le>b;Z.scale.setScalar(mt?0:1),Z.updateMatrix(),ie.setMatrixAt(I,Z.matrix)}ie.instanceMatrix.needsUpdate=!0}});const Me=y==="channels";return t.jsxs(z,{id:"channels",label:P("sc.channels",{shown:c,total:d}),labelPos:[0,.5,C[0]??0],selected:y,onSelect:h,showLabels:O,children:[C.map(g=>t.jsxs("group",{position:[0,0,g],children:[t.jsx("mesh",{geometry:G.g,renderOrder:2,children:t.jsx("meshStandardMaterial",{vertexColors:!0,transparent:!0,opacity:l,roughness:.3,side:ne,depthWrite:!1,clippingPlanes:_e,emissive:Me?"#3fc1c9":"#000000",emissiveIntensity:Me?.3:0})}),t.jsxs("mesh",{renderOrder:1,rotation:[0,0,Math.PI/2],children:[t.jsx("cylinderGeometry",{args:[m*1.45,m*1.45,T,18,1,!0]}),t.jsx("meshStandardMaterial",{color:"#cdeff2",transparent:!0,opacity:.07,roughness:.05,depthWrite:!1,side:ne,clippingPlanes:_e})]})]},g)),t.jsxs("group",{ref:J,children:[C.map(g=>t.jsx("mesh",{geometry:x.g,position:[.001,0,g],children:t.jsx("meshBasicMaterial",{vertexColors:!0,side:ne})},g)),t.jsxs("mesh",{children:[t.jsx("boxGeometry",{args:[.005,.5,(c-1)*xe+.7]}),t.jsx("meshBasicMaterial",{color:"#7ff0f5",transparent:!0,opacity:.12,depthWrite:!1})]})]}),t.jsxs("instancedMesh",{ref:Se,args:[void 0,void 0,c*me],renderOrder:3,children:[t.jsx("sphereGeometry",{args:[Math.max(.012,m*.16),8,8]}),t.jsx("meshBasicMaterial",{color:"#f4fbfc"})]},c)]})}function js(s){const e=s.vis?.geometry.channels??s.channelsTotal,n=Qe(e),i=is(s.vis?.geometry.radius_um??s.radiusUm),r=(n-1)*xe+.2,a=p.useRef(null),{camera:l,size:o}=ve();return p.useEffect(()=>{const u=Math.max(16,22/Math.max(.4,o.width/o.height));l.position.set(-1.2+u*.08,u*.48,u*.87),a.current?.target.set(-1.2,0,0),l.lookAt(-1.2,0,0),a.current?.update()},[l,s.resetSignal,o.width,o.height]),t.jsxs(t.Fragment,{children:[t.jsx("color",{attach:"background",args:["#10243A"]}),t.jsx("fog",{attach:"fog",args:["#071116",30,90]}),t.jsx("ambientLight",{intensity:.45}),t.jsx("hemisphereLight",{args:["#bfe9ee","#0b1d24",.55]}),t.jsx("directionalLight",{position:[6,10,6],intensity:1.2,color:"#f3f7f8"}),t.jsx("directionalLight",{position:[-8,4,-6],intensity:.5,color:"#7fd1d8"}),t.jsx("pointLight",{position:[0,2.5,0],intensity:8,distance:9,color:"#9fe6ec"}),t.jsx("gridHelper",{args:[40,40,"#1d4a55","#10262e"],position:[0,-.26,0]}),t.jsx(bs,{width:r,selected:s.selected,onSelect:s.onSelect,showLabels:s.showLabels}),t.jsx(vs,{vis:s.vis,mf:s.mf,pb:s.pb,scale:s.scale,mode:s.mode,opacity:s.opacity,crossOn:s.crossOn,crossPos:s.crossPos,nDisp:n,nTotal:e,rv:i,showTracers:s.showTracers,selected:s.selected,onSelect:s.onSelect,showLabels:s.showLabels}),t.jsx(Dt,{ref:a,makeDefault:!0,target:[-1.2,0,0],enableDamping:!0,dampingFactor:.08,minDistance:3,maxDistance:60,maxPolarAngle:Math.PI*.49})]})}function ws(){try{const s=document.createElement("canvas");return!!(s.getContext("webgl2")||s.getContext("webgl"))}catch{return!1}}function ge({reason:s,onRetry:e}){return t.jsx("div",{className:"absolute inset-0 grid place-items-center lab-grid-bg bg-[#10243A] theme-instrument p-6","data-testid":"status-webgl-fallback",children:t.jsxs("div",{className:"max-w-md text-center",children:[t.jsx(Rt,{className:"h-8 w-8 mx-auto text-[#e8b04a]"}),t.jsx("h3",{className:"mt-3 font-semibold",children:"3D viewport unavailable"}),t.jsx("p",{className:"mt-1 text-sm text-muted-foreground",children:s}),t.jsx("p",{className:"mt-3 text-xs text-muted-foreground",children:"The interactive apparatus needs WebGL. All Python-computed values, the playback clock, graphs and cross-section profile in the side panels still work and remain synchronized. Nothing shown here is a static substitute for the 3D model."}),e&&t.jsxs("button",{onClick:e,"data-testid":"button-webgl-retry",className:"mt-4 inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs hover:bg-secondary",children:[t.jsx(Je,{className:"h-3.5 w-3.5"}),"Try to restore the viewport"]})]})})}class _s extends p.Component{state={err:null};static getDerivedStateFromError(e){return{err:e instanceof Error?e.message:String(e)}}render(){return this.state.err?t.jsx(ge,{reason:`The renderer stopped: ${this.state.err}`,onRetry:()=>{this.setState({err:null}),this.props.onRetry()}}):this.props.children}}function Ss(s){const[e]=p.useState(ws),[n,i]=p.useState(!1),[r,a]=p.useState(0);return e?n?t.jsx(ge,{reason:"The graphics context was lost (GPU reset or memory pressure).",onRetry:()=>{i(!1),a(l=>l+1)}}):t.jsx(_s,{onRetry:()=>a(l=>l+1),children:t.jsx(zt,{dpr:[1,1.5],camera:{position:s.cameraPos??[1.5,6.2,10.5],fov:40,near:.1,far:200},gl:{antialias:!0,powerPreference:"default",failIfMajorPerformanceCaveat:!1},onCreated:({gl:l,camera:o,size:u})=>{const c=Math.max(16,22/Math.max(.4,u.width/u.height));o.position.set(-1.2+c*.08,c*.48,c*.87),o.lookAt(-1.2,0,0),l.localClippingEnabled=!0,l.domElement.addEventListener("webglcontextlost",d=>{d.preventDefault(),i(!0)})},onPointerMissed:()=>s.onSelect(null),"data-testid":"canvas-3d",children:t.jsx(js,{...s})},r)}):t.jsx(ge,{reason:"This browser or device did not provide a WebGL context (hardware acceleration may be disabled)."})}const Ms=[{id:"pressure",icon:qt},{id:"velocity",icon:Gt},{id:"tracer",icon:Ze}];function Es({mode:s,scale:e,hasData:n}){const{t:i}=ye();if(!n)return null;if(s==="tracer")return t.jsxs("div",{className:"glass rounded-md px-3 py-2 text-[10px] max-w-[260px]","data-testid":"legend-scale",children:[t.jsx("div",{className:"stamp text-[9px] text-muted-foreground",children:i("vp.tracersTitle")}),t.jsx("p",{className:"mt-1 text-muted-foreground leading-snug",children:i("vp.tracersBody")})]});const r=s==="pressure";return t.jsxs("div",{className:"glass rounded-md px-3 py-2 w-[240px]","data-testid":"legend-scale",children:[t.jsx("div",{className:"stamp text-[9px] text-muted-foreground",children:i(r?"vp.legend.pressure":"vp.legend.velocity")}),t.jsx("div",{className:"h-2.5 rounded-sm mt-1.5",style:{background:ms(r?et:tt)}}),t.jsxs("div",{className:"flex justify-between font-num text-[10px] mt-1",dir:"ltr",children:[t.jsx("span",{"data-testid":"text-legend-min",children:r?H(e.pMin,1):`−${H(e.vMax,2)}`}),!r&&t.jsx("span",{children:"0"}),t.jsx("span",{"data-testid":"text-legend-max",children:r?H(e.pMax,1):`+${H(e.vMax,2)}`})]}),!r&&t.jsx("div",{className:"text-[9px] text-muted-foreground mt-0.5",children:i("vp.legend.velocityNote")})]})}function Gs({vis:s,groups:e,methods:n,pb:i,scale:r,view:a,setView:l,channelsTotal:o,radiusUm:u,status:c}){const{t:d}=ye(),m=s?.geometry.channels??o,[f,y]=p.useState(!1);return t.jsxs("div",{className:"relative h-full min-h-[460px] rounded-lg overflow-hidden border border-[hsl(190_40%_30%/.35)] bg-[#10243A] theme-instrument","data-testid":"viewport-3d",children:[t.jsx(Ss,{vis:s,mf:e[a.method],pb:i,scale:r,mode:a.mode,opacity:a.opacity,crossOn:a.crossOn,crossPos:a.crossPos,showLabels:a.showLabels,showTracers:a.showTracers,channelsTotal:o,radiusUm:u,selected:a.selected,onSelect:h=>l({selected:h}),resetSignal:a.resetSignal}),t.jsxs("div",{className:"absolute top-3 left-3 flex flex-col gap-1.5 max-w-[calc(100%_-_120px)] sm:max-w-[60%] pointer-events-none",children:[t.jsx("div",{className:"pointer-events-auto",children:c}),t.jsxs("div",{className:"flex flex-wrap gap-1.5",children:[t.jsx("span",{className:"stamp text-[9px] px-1.5 py-0.5 rounded-[3px] border border-[#e8b04a]/50 text-[#e8b04a] bg-[#10243A]/70","data-testid":"label-conceptual",children:d("vp.conceptual")}),t.jsx("span",{className:"stamp text-[9px] px-1.5 py-0.5 rounded-[3px] border border-primary/50 text-primary bg-[#10243A]/70","data-testid":"label-analytical",children:d("vp.analytical")})]}),t.jsx("span",{className:"font-num text-[10px] text-muted-foreground","data-testid":"text-channel-count",children:d("vp.channelCount",{shown:Qe(m),total:m})})]}),t.jsxs("div",{className:"absolute top-3 right-3 flex flex-col items-end gap-2",children:[t.jsx("button",{type:"button","aria-expanded":f,"aria-controls":"viewport-tools","data-testid":"button-mobile-view-tools",onClick:()=>y(h=>!h),className:"sm:hidden glass rounded-md px-2.5 py-2 text-xs text-primary",children:d(f?"vp.closeControls":"vp.viewControls")}),t.jsxs("div",{id:"viewport-tools",className:F("flex-col items-end gap-2",f?"flex":"hidden","sm:flex"),children:[t.jsx("div",{className:"glass rounded-md p-1 flex",role:"group","aria-label":d("vp.viewMode"),children:Ms.map(h=>t.jsxs("button",{onClick:()=>l({mode:h.id}),"data-testid":`button-mode-${h.id}`,"aria-pressed":a.mode===h.id,className:F("flex items-center gap-1.5 px-2.5 py-1 rounded text-xs",a.mode===h.id?"bg-primary/20 text-primary":"text-muted-foreground hover:text-foreground"),children:[t.jsx(h.icon,{className:"h-3.5 w-3.5"}),d(`vp.mode.${h.id}`)]},h.id))}),n.length>0&&t.jsx("div",{className:"glass rounded-md p-1 flex",role:"group","aria-label":d("vp.topology"),children:n.map(h=>t.jsxs("button",{onClick:()=>l({method:h}),"data-testid":`button-method-${h}`,"aria-pressed":a.method===h,className:F("flex items-center gap-1.5 px-2 py-1 rounded text-[11px]",a.method===h?"bg-secondary text-foreground":"text-muted-foreground hover:text-foreground"),children:[t.jsx("span",{className:"h-2 w-2 rounded-full",style:{background:qe[h]}}),Ve[h]??h]},h))}),t.jsxs("div",{className:"glass rounded-md p-2 w-[230px] space-y-2 text-[11px]",children:[t.jsxs("label",{className:"flex items-center gap-2",children:[t.jsx(Ft,{className:"h-3.5 w-3.5 text-muted-foreground"}),t.jsx("span",{className:"w-16",children:d("vp.opacity")}),t.jsx("input",{type:"range",min:.15,max:1,step:.05,value:a.opacity,onChange:h=>l({opacity:Number(h.target.value)}),className:"lab-range flex-1","aria-label":d("vp.opacityAria"),"data-testid":"input-opacity"})]}),t.jsxs("div",{className:"flex gap-1",children:[t.jsx(fe,{on:a.crossOn,onClick:()=>l({crossOn:!a.crossOn}),icon:Jt,label:d("vp.section"),tid:"button-cross-section"}),t.jsx(fe,{on:a.showTracers,onClick:()=>l({showTracers:!a.showTracers}),icon:Ze,label:d("vp.tracers"),tid:"button-tracers"}),t.jsx(fe,{on:a.showLabels,onClick:()=>l({showLabels:!a.showLabels}),icon:ss,label:d("vp.labels"),tid:"button-labels"})]}),a.crossOn&&t.jsxs("label",{className:"flex items-center gap-2",children:[t.jsx("span",{className:"w-16 text-muted-foreground",children:"x / L"}),t.jsx("input",{type:"range",min:.02,max:.98,step:.01,value:a.crossPos,onChange:h=>l({crossPos:Number(h.target.value)}),className:"lab-range flex-1","aria-label":d("vp.crossAria"),"data-testid":"input-cross-position"}),t.jsx("span",{className:"font-num w-9 text-end",children:a.crossPos.toFixed(2)})]}),t.jsxs("button",{onClick:()=>l({resetSignal:a.resetSignal+1}),"data-testid":"button-reset-view",className:"w-full flex items-center justify-center gap-1.5 border rounded px-2 py-1 hover:bg-secondary",children:[t.jsx(Wt,{className:"h-3.5 w-3.5"}),d("vp.reset")]})]})]})]}),t.jsx("div",{className:"absolute bottom-3 left-3",children:t.jsx(Es,{mode:a.mode,scale:r,hasData:!!s})}),t.jsx("div",{className:"absolute bottom-3 right-3 text-[10px] text-muted-foreground font-num hidden md:block pointer-events-none",children:d("vp.hint")})]})}function fe({on:s,onClick:e,icon:n,label:i,tid:r}){return t.jsxs("button",{onClick:e,"aria-pressed":s,"data-testid":r,className:F("flex-1 flex items-center justify-center gap-1 rounded border px-1.5 py-1",s?"border-primary/60 bg-primary/15 text-primary":"text-muted-foreground hover:text-foreground"),children:[t.jsx(n,{className:"h-3.5 w-3.5"}),i]})}function Is({pb:s,switchS:e,disabled:n,idPrefix:i=""}){const{t:r}=ye(),a=rs(s,50),l=a.tMax-a.tMin||1,o=(a.t-a.tMin)/l*100,u=e!==void 0?(e-a.tMin)/l*100:null;return t.jsxs("div",{className:F("glass rounded-md px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-2",n&&"opacity-50 pointer-events-none"),"aria-label":r("pb.aria"),children:[t.jsx("button",{onClick:()=>s.toggle(),"data-testid":`${i}button-${a.playing?"pause":"play"}`,"aria-label":a.playing?r("pb.pause"):a.t>a.tMin?r("pb.resume"):r("pb.start"),className:"h-8 w-8 grid place-items-center rounded-md bg-primary text-primary-foreground hover:brightness-110 active:translate-y-px",children:a.playing?t.jsx(Yt,{className:"h-4 w-4"}):t.jsx(vt,{className:"h-4 w-4 translate-x-px"})}),t.jsx("button",{onClick:()=>s.restart(),"data-testid":`${i}button-restart`,"aria-label":r("pb.restart"),title:r("pb.restartTitle"),className:"h-8 w-8 grid place-items-center rounded-md border hover:bg-secondary",children:t.jsx(Je,{className:"h-4 w-4"})}),e!==void 0&&t.jsxs("button",{onClick:()=>s.seek(Math.max(a.tMin,e-2)),"data-testid":`${i}button-jump-switch`,title:r("pb.jumpTitle"),className:"h-8 px-2 inline-flex items-center gap-1 rounded-md border text-[11px] hover:bg-secondary",children:[t.jsx(Qt,{className:"h-3.5 w-3.5 rtl:-scale-x-100"}),r("pb.switch")]}),t.jsxs("div",{dir:"ltr",className:"font-num text-xs w-[118px] tabular-nums","data-testid":`${i}text-time`,children:["t = ",t.jsx("b",{className:"text-foreground",children:a.t.toFixed(2)}),t.jsxs("span",{className:"text-muted-foreground",children:[" / ",a.tMax.toFixed(1)," s"]})]}),t.jsxs("div",{className:"relative flex-1 min-w-[160px]",dir:"ltr",children:[t.jsx("div",{className:"absolute inset-x-0 top-1/2 -translate-y-1/2 h-1 rounded bg-secondary"}),t.jsx("div",{className:"absolute left-0 top-1/2 -translate-y-1/2 h-1 rounded bg-primary/70",style:{width:`${o}%`}}),u!==null&&u>=0&&u<=100&&t.jsx("div",{className:"absolute top-0 bottom-0 w-px bg-[#ef7a5a]",style:{left:`${u}%`},title:r("pb.switch")}),t.jsx("input",{type:"range",min:a.tMin,max:a.tMax,step:l/1e3,value:a.t,onChange:c=>s.seek(Number(c.target.value)),"aria-label":r("pb.scrub"),"data-testid":`${i}input-scrub`,className:"lab-range relative w-full opacity-0 h-6 cursor-pointer"}),t.jsx("div",{className:"pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-background",style:{left:`${o}%`}})]}),t.jsx("div",{className:"flex rounded-md border overflow-hidden",role:"group","aria-label":r("pb.speed"),dir:"ltr",children:ns.map(c=>t.jsxs("button",{onClick:()=>s.setSpeed(c),"data-testid":`${i}button-speed-${c}`,"aria-pressed":a.speed===c,className:F("px-2 py-1 font-num text-[11px]",a.speed===c?"bg-primary/20 text-primary":"text-muted-foreground hover:bg-secondary"),children:[c,"x"]},c))})]})}export{qt as G,Ps as L,Os as P,Jt as S,Rs as T,Ss as V,ls as a,Us as b,zs as c,Qe as d,Gs as e,Is as f,Bs as g,Es as h,Te as i,Ts as m,os as s,Ds as t,rs as u};
