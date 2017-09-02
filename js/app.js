import '../css/app.scss';
const feathers = require('feathers/client');
const rest = require('feathers-rest/client');
const axios = require('axios');
const hooks = require('feathers-hooks');
const localStorage = require('localstorage-memory');
const auth = require('feathers-authentication-client');
const hello = require('hellojs/dist/hello.all.js');

const client = feathers();
// NOTE: the order is important: auth must be configured _after_ rest/socket
client
    .configure(hooks())
    .configure(rest('http://localhost:3030').axios(axios))
    .configure(auth({
        storage: localStorage
    }));

// START setup hellojs
hello.init({
    google: '28065581468-4rbjg22ltb9n6nd183e9mh92rsuqe3j7.apps.googleusercontent.com'
}, {
    redirect_uri: '/index.html'
});
document
    .querySelector('.btn-google')
    .addEventListener('click', () => {
        hello('google').login({
            scope: 'email'
        })
    });
hello.on('auth.login', async function (auth) {
    const socialToken = auth.authResponse.access_token;
    const userInfo = await hello(auth.network).api('me');
    const userId = userInfo.id;
    const userEmail = userInfo.email;
    serverAuth(userEmail, userId, socialToken);
});
// END setup hellojs

async function serverAuth(email, socialId, socialToken) {
    try {
        // server side FeathersJS authentication
        const response = await client.authenticate({
            strategy: 'social-token',
            email,
            socialId,
            socialToken
        });
        console.log('Authenticated!', response);

        // get user info from JWT
        const payload = await client
            .passport
            .verifyJWT(response.accessToken);
        console.log('JWT Payload', payload);

        // get and set user for FeathersJS client
        const user = await client
            .service('users')
            .get(payload.userId);
        client.set('user', user);
        console.log('User', client.get('user'));
        
    } catch (err) {
        console.error('Error authenticating!');
        console.error(err);
    }
}