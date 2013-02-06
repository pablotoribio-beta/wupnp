Wu.Views.menu = Backbone.View.extend({

  template: JST['menu'],

  events:{
    "click .renderers li"  : "setRenderer",
    "click .musicLink"     : "gotoMusic", 
  },

  initialize: function(){
    this.listenTo(Wu.Layout.header,"menuClick",this.show);
    this.listenTo(this.collection,"add remove reset",this.render);
    this.listenTo(Wu.Cache.Collections.playlists,"add remove reset",this.render);
    this.listenTo(this,"hideMusic",this.hideMusic);
    this.listenTo(this,"showMusic",this.showMusic);
    this.listenTo(this,"inserted",this.setupDrag);
  },
  render: function(){
    var self = this;
    this.template({playlists:Wu.Cache.Collections.playlists, renderers: this.collection},function(err,html){
      self.$el.html(html);
      if(self.showMusicLink)
        self.showMusic();
    });
    return this;
  },
  unrender: function(){
    $("#mask").off("click",$.proxy(this.hide,this));
    this.stopListening();
  },
  setupDrag: function(){
    var self = this;
    Drawer.init({el:this.$el});
    this.$el.on("left",function(){
      self.$el.css("left","-100%");
    });
    this.$el.on("right",function(){
      self.$el.css("left","0%");
    });
  },
  show: function(){
    this.$el.removeClass("hide");
    $("#mask").show()
    .on("click",$.proxy(this.hide,this));
  },
  hide: function(){
    this.$el.addClass('hide');
    $("#mask").hide()
    .off("click",$.proxy(this.hide,this));
  },
  setRenderer: function(e){
    var uuid = $(e.target).attr("uuid");
    Wu.Cache.Models.player.setRenderer(uuid);
  },
  hideMusic: function(){
    this.$(".musicLink").hide();
    this.showMusicLink = false;
  },
  showMusic:function(){
    this.$(".musicLink").show();
    this.showMusicLink = true;
  },
  gotoMusic:function(){
    var category = Wu.Cache.Models.category.get("id") || "Artist";
    this.hide();
    Backbone.history.navigate("/category/"+category,{trigger:true});
  }

});