var OAuth2 = require('lib/node-oauth').OAuth2,
	querystring = require('querystring'),
	task = require('task/base'),
	util = require('util');
	
// - - - static

var facebookConfig = project.config.consumerConfig.facebook;
var facebookScopes = (facebookConfig ? facebookConfig.scopes : null);

if (!facebookScopes) {

	util.extend (facebookConfig, {	
		"scopes": {
			"profile"			: "user_about_me",
			"email"				: "email",
			"activities"		: "user_activities",
			"birthday"			: "user_birthday",
			"checkins"			: "user_checkins",
			"education_history"	: "user_education_history",
			"events"			: "user_events",
			"groups"			: "user_groups",
			"hometown"			: "user_hometown",
			"interests"			: "user_interests",
			"likes"				: "user_likes",
			"location"			: "user_location",
			"notes"				: "user_notes",
			"online_presence"	: "user_online_presence",
			"photo_video_tags"	: "user_photo_video_tags",
			"photos"			: "user_photos",
			"questions"			: "user_questions",
			"relationships"		: "user_relationships",
			"relationship_details"	: "user_relationship_details",
			"religion_politics"		: "user_religion_politics",
			"status"			: "user_status",
			"videos"			: "user_videos",
			"website"			: "user_website",
			"work_history"		: "user_work_history",
			"contacts"			: "read_friendlists",
			"insights"			: "read_insights",
			"mailbox"			: "read_mailbox",
			"requests"			: "read_requests",
			"stream"			: "read_stream",
			"xmpp_login"		: "xmpp_login",
			"ads_management"	: "ads_management",
			"create_event"		: "create_event",
			"manage_friendlists"	: "manage_friendlists",
			"manage_notifications"	: "manage_notifications",
			"offline_access"		: "offline_access",
			"publish_checkins"		: "publish_checkins",
			"publish_stream"		: "publish_stream",
			"rsvp_event"		: "rsvp_event",
			"publish_actions"	: "publish_actions"
		}
	});
	
	facebookScopes = facebookConfig.scopes;
	
//	console.log ('<------facebookConfig', facebookConfig);
}

// - - -

var facebook = module.exports = function(config) {

	this.scopes = [
		"profile",
		"contacts",
		"groups"
	];

	this.init (config);		

};

util.inherits (facebook, task);

util.extend (facebook.prototype, {

	run: function() {
		
		var self = this;
		self.failed('use method [login|callback|profile|grouplist]');
		
	},
	
	login: function () {
		
		var self = this;
		var req = self.req;
		var res = self.res;
		var query = req.url.query;
		
		var scopes = [];
		
		self.scopes.map(function(scope) {
			scopes.push (facebookScopes[scope]);
		});
		
		var getParams = {
			client_id: facebookConfig.appId,
			redirect_uri: facebookConfig.callbackUrl,
			scope: scopes.join(','),
		};
		
		var redirectUrl = facebookConfig.requestTokenUrl + "?" + querystring.stringify(getParams);
		
		//req._requestUrl			= redirectUrl;
		//req._authorize_callback = facebookConfig.redirectUrl + ( query.action && query.action != "" ? "?action="+querystring.escape(query.action) : "" );
			
		self.completed(redirectUrl);
	},
	
	callback: function() {
		
		var self = this;
		var req = self.req;
		var query = req.url.query;
		var tokens = req.user.tokens;
		
		if (query.error || !query.code) {
			self.failed (query.error_description || "token was not accepted");
		}
		
		var oa = new OAuth2(facebookConfig.appId,  facebookConfig.appSecret,  facebookConfig.baseUrl);
		
		oa.getOAuthAccessToken(
			query.code,
			{redirect_uri: facebookConfig.callbackUrl},
			function( error, access_token, refresh_token ){
				
				if (error) {
					
					self.failed(error);
				
				} else {
					
					tokens.oauth_access_token = access_token;
					if (refresh_token) tokens.oauth_refresh_token = refresh_token;
					
					var redirectUrl = (query.action && query.action != "") ? query.action : "/";
					self.completed (redirectUrl)
					
				}
		});
	},
	
	profile: function() {
		
		var self = this;
		var req = self.req;
		var tokens = req.user.tokens;
		
		var oa = new OAuth2(facebookConfig.appId,  facebookConfig.appSecret,  facebookConfig.baseUrl);
		
		oa.getProtectedResource(
			facebookConfig.baseUrl+"/me",
			tokens.oauth_access_token,
			function (error, data, response) {
				
				if (error) {
					self.failed(error);
				} else {
					try {
						var user = JSON.parse(data);
						self.completed(self.mappingUser(user));
					} catch (e) {
						self.failed(e);
					}
				}
		});
	},
	
	mappingUser: function(user) {
		
		return {
			name: user.name,
			email: user.username + "@facebook.com",
			avatar: "http://graph.facebook.com/" + user.username + "/picture",
			link: user.link
		};
		
	},
	
	grouplist: function() {
		
		var self = this;
		var req = self.req;
		var tokens = req.user.tokens;
		
		var oa = new OAuth2(facebookConfig.appId,  facebookConfig.appSecret,  facebookConfig.baseUrl);
		
		oa.getProtectedResource(
			facebookConfig.baseUrl+"/me/groups",
			tokens.oauth_access_token,
			function (error, data, response) {
				
				if (error) {
					self.failed(error);
				} else {
					try {
						var groups = JSON.parse(data);
						self.completed(self.mappingGroups(groups));
					} catch (e) {
						self.failed(e);
					}
				}
		});
	},
	
	mappingGroups: function(groups) {
		
		var groupIds = groups.data.map(function(group) {
			return group.id;
		});
		
		return groupIds;
		
	}
});