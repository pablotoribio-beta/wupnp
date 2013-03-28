var db = require('./db');





var filterToSQL = function(filter){
  var where = "";
  if(typeof(filter) === 'object' && Object.keys(filter).length > 0){
    where = "WHERE "
    for(var column in filter){
      where += column + "='" + filter[column] + "' AND "; 
    }
    where = where.substring(0,where.length - 5);
  }
  return where;
}


/**
 * playlist object initalized with an id (existing playlist) or name (new playlist)
 * @param  {id string | objectId | name string } id 
 */
var playlist = function(id,uuid,cb){
  //if uuid, check if a playlist already exists for that uuid otherwise create one
  if(uuid || typeof(uuid) === 'string'){
    this.uuid = uuid;
    db.get("SELECT _id FROM lists WHERE uuid = ?",uuid,function(err,doc){
      if(!err && doc){
        this.id = doc._id;
        cb(this.id,this);
      }else{
        this._create(id,cb);
      }
    }.bind(this));
  }
  //Hack: assume id is valid playlist id
  else if(typeof(id) === "number"){
    this.id = id;
  }else{
    //create the new playlist with name (id)
    cb = uuid;
    this._create(id,cb);
  }
}


playlist.prototype.order = function(cursor,count,callback){
  var listId = this.id,
      oldCount = count;

  cursor.each(function(err,doc){
    if(err){
      callback(err);
    }else if(doc !== null){
      ++count;
      db.run("INSERT OR REPLACE INTO playlist_tracks (list_id,track_id,position) VALUES (?,?,?)",listId,doc._id || doc.track_id,count);
    }
  },function(){
    db.run("UPDATE lists SET count = ? WHERE _id = ?",count,listId);
    callback(null,count-oldCount);
  });
},

/**
 * add all tracks matching filter to playlist
 * @param  {object}   filter   mongodb query object
 * @param  {Function} callback called on completion
 */
playlist.prototype.add = function(filter,callback){
  var WHERE = filterToSQL(filter);
  this.getCount(function(err,count){
    if(err){
      callback(err);
    }else{
      var stmt = db.prepare("SELECT _id FROM tracks "+WHERE+" ORDER BY Album, TrackNumber");
      this.order(stmt,count,callback);
    }
  }.bind(this));
}
/**
 * remove all tracks matching filter from playlist
 * @param  {object}   filter   mongodb query object
 * @param  {Function} callback called on completion
 * @return {monogjs cursor}   
 */
playlist.prototype.remove = function(filter,callback){
  var WHERE = filter;
  if(typeof(filter) === "object"){
    WHERE = filterToSQL(filter) + " AND lists._id = " + this.id;
  }
  console.log("DELETE FROM playlist_tracks JOIN tracks ON track_id = _id "+WHERE)
  db.run("DELETE FROM playlist_tracks JOIN tracks ON track_id = _id "+WHERE,function(err){
    console.log("deleted");
    console.log(err);
    var stmt = db.prepare("SELECT track_id FROM playlist_tracks WHERE list_id = ? ORDER BY position",this.id);
    this.order(stmt,0,callback);
  }.bind(this));  
}

playlist.prototype.removeAfter = function(position,callback){
  var listId = this.id;
  db.run("DELETE FROM playlist_tracks WHERE list_id = ? AND position > ?",listId,position,function(err){
    console.log('HERERADASDASDASD');
    db.run("UPDATE lists SET count = count + ? WHERE _id = ?",this.changes,listId,callback);
  })
}
/**
 * Delete playlist form list db, and remove all tracks
 * @param  {Function} callback 
 */
playlist.prototype.drop = function(callback){
  var id = this.id;
  db.run("DELETE FROM playlist_tracks WHERE list_id = ?",this.id);
  db.run("DELETE FROM lists WHERE _id = ?",this.id,callback);
}

/**
 * create a new playlist
 * @param  {[type]}   name  : name of playlist
 * @param  {Function} callback 
 */
playlist.prototype._create = function(name,cb){
  var self = this;
  db.run("INSERT INTO lists VALUES (NULL,?,?,?)",name,0,this.uuid || null,function(err){
    if(!err){
      self.id = this.lastID; 
      if(typeof(cb) == "function")
        cb(self.id,self);
    }
  });
}

playlist.prototype.getCount = function(callback){
  db.get("SELECT count FROM lists WHERE _id = ?",this.id,function(err,doc){
    if(err || doc === null){
      err = err || {error: "playlist not found"}
      callback(err);
    }else{
      callback(null,doc.count);
    }
  })
}

playlist.prototype.attributes = function(cb){
  db.get("SELECT * FROM lists WHERE _id = ?",this.id,cb)
}


//options: 
// limit: number || false for no limit  : default = 2
// categories: defualt {}
playlist.prototype.findAt = function(position,settings,cb){
  var id = this.id
      ,obj = {}
      ,sort = {}
      ,options = {
        categories: "*",
        limit: 2
      };

  if(typeof(settings) === "function"){
    cb = settings;
  }else if(typeof(settings) === "object"){
    //options = _.extend({limit :2, categories: {}},settings);
    options.limit = (settings.limit === undefined) ? 2 : settings.limit;
    options.categories = (settings.categories === undefined) ? "*" : Object.keys(settings.categories).join();
  }

  var stmt = "SELECT "+options.categories+" FROM tracks JOIN playlist_tracks ON (track_id = _id) WHERE playlist_tracks.list_id = ? AND playlist_tracks.position > ? ORDER BY playlist_tracks.position";
  stmt += options.limit ? " LIMIT "+options.limit : "";
  console.log(stmt);
  console.log(this.id);
  console.log(typeof(this.id))
  db.all(stmt,this.id,position,cb);
}

playlist.prototype.findList = function(filter,categories,cb){
  var categories = {} || categories,
      where = filterToSQL(filter);
  select = Object.keys(categories).join() || "*";

  db.all("SELECT "+select+" FROM lists",cb)
}

exports.playlist = playlist;