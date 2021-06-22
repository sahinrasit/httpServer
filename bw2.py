#!/usr/bin/python

"""
This example shows how to create an empty Mininet object
(without a topology object) and add nodes to it manually.
"""

from mininet.net import Mininet
from mininet.node import Controller
from mininet.cli import CLI
from mininet.log import setLogLevel, info
from mininet.link import TCLink
import time

def startServer1(node):
    node.cmd('cd /home/mininet/Desktop/httpServer/')
    node.cmd('xterm -e sudo python -m SimpleHTTPServer 80 &')

#def startServer2(node):
#    node.cmd('cd /Home/Desktop/13052017/')
#    node.cmd('xterm -e nodejs server &')

def startClient(node):
    node.cmd('xterm -e chromium-browser --no-sandbox --user-data-dir=/home/mininet/Desktop/httpServer/logs/ --enable-logging &')

def emptyNet():

    "Create an empty network and add nodes to it."

    net = Mininet(link=TCLink, controller=Controller )

    info( '*** Adding controller\n' )
    net.addController( 'c0' )

    info( '*** Adding hosts\n' )
    h1 = net.addHost( 'h1', ip='10.0.0.1' )
    h2 = net.addHost( 'h2', ip='10.0.0.2' )

    info( '*** Adding switch\n' )
    s3 = net.addSwitch( 's3' )

    info( '*** Creating links\n' )
    l1 = net.addLink( h1, s3,bw=2)
    l2 = net.addLink( h2, s3,bw=2)

    info( '*** Starting network\n')
    net.start()

    startServer1(h1)
    startClient(h2)	

    info( '*** Running CLI\n' )
    CLI( net )
if __name__ == '__main__':
    setLogLevel( 'info' )
    emptyNet()
